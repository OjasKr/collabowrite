"use strict";

import mongoose from "mongoose";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Document } from "../models/Document";
import { User } from "../models/User";

const SAVE_DEBOUNCE_MS = 2500;
const MAX_VERSIONS = 10;

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
