"use strict";

import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Document } from "../models/Document";
import { DocumentVersion } from "../models/DocumentVersion";
import { User } from "../models/User";
import { AppError } from "../utils/errors";
import { DocAccessRequest } from "../middleware/checkDocAccess";

const DEFAULT_CONTENT = { ops: [] };
const MAX_VERSIONS = 10;

export const listMyDocuments = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Document.find({ owner: userId, deletedAt: undefined })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title owner version updatedAt lastEditedBy")
        .lean(),
      Document.countDocuments({ owner: userId, deletedAt: undefined }),
    ]);
    res.json({ success: true, documents: docs, total, page, limit });
  } catch (e) {
    next(e);
  }
};

export const listSharedWithMe = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Document.find({
        "collaborators.user": userId,
        deletedAt: undefined,
      })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title owner collaborators version updatedAt lastEditedBy")
        .populate("owner", "name email")
        .lean(),
      Document.countDocuments({ "collaborators.user": userId, deletedAt: undefined }),
    ]);
    res.json({ success: true, documents: docs, total, page, limit });
  } catch (e) {
    next(e);
  }
};

export const listRecentlyEdited = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(20, Math.max(1, parseInt(String(req.query.limit), 10) || 10));
    const docs = await Document.find({
      $or: [{ owner: userId }, { "collaborators.user": userId }],
      deletedAt: undefined,
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("title owner version updatedAt lastEditedBy")
      .lean();
    res.json({ success: true, documents: docs });
  } catch (e) {
    next(e);
  }
};

export const createDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const title = (req.body.title as string)?.trim() || "Untitled";
    const doc = await Document.create({
      title,
      content: DEFAULT_CONTENT,
      owner: userId,
      collaborators: [],
      isPublic: false,
      version: 1,
      lastEditedBy: userId,
    });
    const populated = await Document.findById(doc._id)
      .select("title owner version updatedAt lastEditedBy")
      .populate("owner", "name email")
      .lean();
    res.status(201).json({ success: true, document: populated });
  } catch (e) {
    next(e);
  }
};

export const getDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doc = req.doc;
    if (!doc) throw new AppError("Document not found.", 404);
    res.json({
      success: true,
      document: doc,
      role: req.docRole,
    });
  } catch (e) {
    next(e);
  }
};

export const updateDocumentContent = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const { content } = req.body;
    if (content === undefined) {
      throw new AppError("Content is required.", 400);
    }
    const doc = await Document.findById(docId).lean();
    if (!doc) throw new AppError("Document not found.", 404);
    const newVersion = (doc.version || 1) + 1;
    await DocumentVersion.create({
      document: docId,
      version: doc.version || 1,
      content: doc.content,
      savedBy: userId,
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
    const updated = await Document.findByIdAndUpdate(
      docId,
      {
        content,
        version: newVersion,
        lastEditedBy: userId,
        updatedAt: new Date(),
      },
      { new: true }
    )
      .select("title content owner collaborators isPublic version lastEditedBy updatedAt")
      .lean();
    res.json({ success: true, document: updated });
  } catch (e) {
    next(e);
  }
};

export const updateDocumentTitle = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const title = (req.body.title as string)?.trim();
    if (!title) throw new AppError("Title is required.", 400);
    const updated = await Document.findByIdAndUpdate(
      docId,
      { title, updatedAt: new Date() },
      { new: true }
    )
      .select("title updatedAt")
      .lean();
    if (!updated) throw new AppError("Document not found.", 404);
    res.json({ success: true, document: updated });
  } catch (e) {
    next(e);
  }
};

export const getVersions = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const versions = await DocumentVersion.find({ document: docId })
      .sort({ version: -1 })
      .limit(MAX_VERSIONS)
      .populate("savedBy", "name email")
      .lean();
    res.json({ success: true, versions });
  } catch (e) {
    next(e);
  }
};

export const restoreVersion = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const versionId = req.params.versionId;
    const userId = req.user!.id;
    const versionDoc = await DocumentVersion.findOne({
      _id: versionId,
      document: docId,
    }).lean();
    if (!versionDoc) throw new AppError("Version not found.", 404);
    const doc = await Document.findByIdAndUpdate(
      docId,
      {
        content: versionDoc.content,
        version: (versionDoc.version || 1) + 1,
        lastEditedBy: userId,
        updatedAt: new Date(),
      },
      { new: true }
    )
      .select("title content version lastEditedBy updatedAt")
      .lean();
    res.json({ success: true, document: doc });
  } catch (e) {
    next(e);
  }
};

export const shareDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const { email, role } = req.body;
    if (!email || !role) {
      throw new AppError("Email and role are required.", 400);
    }
    if (role !== "viewer" && role !== "editor") {
      throw new AppError("Role must be viewer or editor.", 400);
    }
    const targetUser = await User.findOne({ email: (email as string).trim().toLowerCase() })
      .select("_id")
      .lean();
    if (!targetUser) {
      throw new AppError("User with this email not found.", 404);
    }
    const targetId = targetUser._id.toString();
    if (targetId === userId) {
      throw new AppError("You cannot share a document with yourself.", 400);
    }
    const doc = await Document.findById(docId);
    if (!doc) throw new AppError("Document not found.", 404);
    const exists = doc.collaborators.some(
      (c) => c.user.toString() === targetId
    );
    if (exists) {
      throw new AppError("User is already a collaborator.", 409);
    }
    doc.collaborators.push({
      user: targetUser._id as mongoose.Types.ObjectId,
      role: role as "viewer" | "editor",
    });
    await doc.save();
    const updated = await Document.findById(docId)
      .select("collaborators")
      .populate("collaborators.user", "name email")
      .lean();
    res.json({ success: true, collaborators: updated?.collaborators || [] });
  } catch (e) {
    next(e);
  }
};

export const unshareDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const removeUserId = req.params.userId;
    const doc = await Document.findById(docId);
    if (!doc) throw new AppError("Document not found.", 404);
    doc.collaborators = doc.collaborators.filter(
      (c) => c.user.toString() !== removeUserId
    );
    await doc.save();
    const updated = await Document.findById(docId)
      .select("collaborators")
      .populate("collaborators.user", "name email")
      .lean();
    res.json({ success: true, collaborators: updated?.collaborators || [] });
  } catch (e) {
    next(e);
  }
};

export const getCollaborators = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    if (!docId) throw new AppError("Document ID required.", 400);
    const populated = await Document.findById(docId)
      .select("owner collaborators")
      .populate("owner", "name email")
      .populate("collaborators.user", "name email")
      .lean();
    res.json({
      success: true,
      owner: populated?.owner,
      collaborators: populated?.collaborators || [],
    });
  } catch (e) {
    next(e);
  }
};

export const deleteDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const soft = req.query.soft !== "false";
    if (soft) {
      await Document.findByIdAndUpdate(docId, {
        deletedAt: new Date(),
        updatedAt: new Date(),
      });
      res.json({ success: true, message: "Document moved to trash." });
    } else {
      await Document.findByIdAndDelete(docId);
      await DocumentVersion.deleteMany({ document: docId });
      res.json({ success: true, message: "Document deleted permanently." });
    }
  } catch (e) {
    next(e);
  }
};

export const copyDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const source = await Document.findById(docId).lean();
    if (!source) throw new AppError("Document not found.", 404);
    const newDoc = await Document.create({
      title: `${source.title} (Copy)`,
      content: source.content,
      owner: userId,
      collaborators: [],
      isPublic: false,
      version: 1,
      lastEditedBy: userId,
    });
    const populated = await Document.findById(newDoc._id)
      .select("title owner version updatedAt _id")
      .populate("owner", "name email")
      .lean();
    res.status(201).json({ success: true, document: populated });
  } catch (e) {
    next(e);
  }
};
