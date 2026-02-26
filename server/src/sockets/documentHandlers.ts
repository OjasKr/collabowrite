"use strict";

import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Document } from "../models/Document";
import { User } from "../models/User";
import { generateAIResponse } from "../utils/ai.service";

const SAVE_DEBOUNCE_MS = 2500;
const MAX_VERSIONS = 10;
const MAX_AI_TEXT_LENGTH = 3000;

const AI_PROMPTS: Record<string, (text: string) => string> = {
  refine: (t) =>
    `Improve the following text for grammar and clarity. Keep the same meaning and tone. Output only the improved text, no explanations.\n\n${t}`,
  summarize: (t) =>
    `Summarize the following text as bullet points. Be concise. Output only the bullet list, no intro or outro.\n\n${t}`,
  rewrite: (t) =>
    `Rewrite the following text in a professional, formal tone. Keep the same meaning. Output only the rewritten text.\n\n${t}`,
  expand: (t) =>
    `Expand the following text with more detail and explanation. Keep the same tone and style. Output only the expanded text.\n\n${t}`,
  title: (t) =>
    `Suggest a short, clear document title (max 10 words) based on the following content. Output only the title, nothing else.\n\n${t}`,
  tone: (t) =>
    `Identify the tone of the following text in one or two words (e.g. Formal, Casual, Persuasive, Informative, Friendly). Output only the tone label(s), nothing else.\n\n${t}`,
};

interface AuthPayload {
  userId: string;
  email: string;
}

interface SocketWithUser extends Socket {
  userId?: string;
  docId?: string;
  saveTimeout?: NodeJS.Timeout;
}

const getUserIdFromToken = (token: string | undefined): string | null => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || "access-secret"
    ) as AuthPayload;
    return decoded.userId;
  } catch {
    return null;
  }
};

const activeUsers = new Map<string, Set<string>>();

export const registerDocumentHandlers = (io: Server): void => {
  io.use((socket: SocketWithUser, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace?.("Bearer ", "");
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return next(new Error("Authentication required"));
    }
    socket.userId = userId;
    next();
  });

  io.on("connection", (socket: SocketWithUser) => {
    socket.on("join-document", async (docId: string) => {
      if (!docId || !socket.userId) return;
      try {
        const doc = await Document.findById(docId).lean();
        if (!doc || doc.deletedAt) {
          socket.emit("document-error", { message: "Document not found." });
          return;
        }
        const ownerId = (doc.owner as unknown as { _id?: string })?._id?.toString?.() ?? (doc.owner as unknown as string)?.toString?.();
        const canAccess =
          ownerId === socket.userId ||
          doc.isPublic ||
          doc.collaborators?.some(
            (c) => (c.user as unknown as string)?.toString?.() === socket.userId
          );
        if (!canAccess) {
          socket.emit("document-error", { message: "Access denied." });
          return;
        }
        if (socket.docId) {
          socket.leave(socket.docId);
          const set = activeUsers.get(socket.docId);
          if (set) {
            set.delete(socket.userId);
            if (set.size === 0) activeUsers.delete(socket.docId);
            else {
              const users = await User.find({ _id: { $in: Array.from(set) } })
                .select("_id name email")
                .lean();
              io.to(socket.docId).emit("active-users", users.map((u) => ({
                _id: u._id,
                name: u.name,
                email: u.email,
              })));
            }
          }
        }
        socket.docId = docId;
        socket.join(docId);
        let userSet = activeUsers.get(docId);
        if (!userSet) {
          userSet = new Set();
          activeUsers.set(docId, userSet);
        }
        userSet.add(socket.userId);
        const userIds = Array.from(userSet);
        const users = await User.find({ _id: { $in: userIds } })
          .select("_id name email")
          .lean();
        io.to(docId).emit("active-users", users.map((u) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
        })));
        socket.emit("load-document", doc.content);

        socket.on("send-changes", (delta: object) => {
          socket.broadcast.to(docId).emit("receive-changes", delta);
        });

        socket.on("typing", () => {
          socket.broadcast.to(docId).emit("user-typing", { userId: socket.userId });
        });

        socket.on("cursor-position", (payload: { index?: number; length?: number }) => {
          const index = typeof payload?.index === "number" && payload.index >= 0 ? payload.index : 0;
          const length = typeof payload?.length === "number" && payload.length >= 0 ? payload.length : 0;
          socket.broadcast.to(docId).emit("cursor-update", {
            userId: socket.userId,
            index,
            length,
          });
        });

        socket.on("request-ai-suggestion", async (payload: { type?: string; text?: string }) => {
          const type = typeof payload?.type === "string" ? payload.type : "";
          const text = typeof payload?.text === "string" ? payload.text.trim() : "";
          if (!type || !AI_PROMPTS[type]) {
            socket.emit("ai-suggestion", { error: "Invalid AI request type." });
            return;
          }
          if (!text || text.length > MAX_AI_TEXT_LENGTH) {
            socket.emit("ai-suggestion", {
              error: text.length > MAX_AI_TEXT_LENGTH
                ? `Text must be at most ${MAX_AI_TEXT_LENGTH} characters.`
                : "Text is required.",
            });
            return;
          }
          try {
            const doc = await Document.findById(docId).lean();
            if (!doc) {
              socket.emit("ai-suggestion", { error: "Document not found." });
              return;
            }
            const ownerId = (doc.owner as unknown as string)?.toString?.() ?? (doc.owner as unknown as { _id: string })?._id?.toString?.();
            const isEditor =
              ownerId === socket.userId ||
              doc.collaborators?.some(
                (c) =>
                  (c.user as unknown as string)?.toString?.() === socket.userId &&
                  c.role === "editor"
              );
            if (!isEditor) {
              socket.emit("ai-suggestion", { error: "Edit access required." });
              return;
            }
            const prompt = AI_PROMPTS[type](text);
            const result = await generateAIResponse(prompt, socket.userId ?? undefined);
            socket.emit("ai-suggestion", { type, result });
          } catch (err) {
            const message = err instanceof Error ? err.message : "AI request failed.";
            socket.emit("ai-suggestion", { error: message });
          }
        });

        socket.on("save-document", (content: object) => {
          if (socket.saveTimeout) clearTimeout(socket.saveTimeout);
          socket.saveTimeout = setTimeout(async () => {
            try {
              const doc = await Document.findById(docId).lean();
              if (!doc) return;
              const ownerId = (doc.owner as unknown as string)?.toString?.() ?? (doc.owner as unknown as { _id: string })?._id?.toString?.();
              const isEditor =
                ownerId === socket.userId ||
                doc.collaborators?.some(
                  (c) =>
                    (c.user as unknown as string)?.toString?.() === socket.userId &&
                    c.role === "editor"
                );
              if (!isEditor) return;
              const { DocumentVersion } = await import("../models/DocumentVersion");
              const newVersion = (doc.version || 1) + 1;
              await DocumentVersion.create({
                document: docId,
                version: doc.version || 1,
                content: doc.content,
                savedBy: socket.userId,
              });
              const versionCount = await DocumentVersion.countDocuments({ document: docId });
              if (versionCount > MAX_VERSIONS) {
                const toRemove = await DocumentVersion.find({ document: docId })
                  .sort({ version: 1 })
                  .limit(versionCount - MAX_VERSIONS)
                  .select("_id")
                  .lean();
                await DocumentVersion.deleteMany({ _id: { $in: toRemove.map((v) => v._id) } });
              }
              await Document.findByIdAndUpdate(docId, {
                content,
                version: newVersion,
                lastEditedBy: new mongoose.Types.ObjectId(socket.userId),
                updatedAt: new Date(),
              });
              io.to(docId).emit("document-saved", { version: newVersion });
            } catch {
              // ignore
            }
          }, SAVE_DEBOUNCE_MS);
        });
      } catch {
        socket.emit("document-error", { message: "Failed to join document." });
      }
    });

    socket.on("disconnect", async () => {
      const docId = socket.docId;
      const userId = socket.userId;
      if (docId && userId) {
        const set = activeUsers.get(docId);
        if (set) {
          set.delete(userId);
          if (set.size === 0) {
            activeUsers.delete(docId);
          } else {
            const users = await User.find({ _id: { $in: Array.from(set) } })
              .select("_id name email")
              .lean();
            io.to(docId).emit("active-users", users.map((u) => ({
              _id: u._id,
              name: u.name,
              email: u.email,
            })));
          }
        }
      }
      if (socket.saveTimeout) clearTimeout(socket.saveTimeout);
    });
  });
};
