"use strict";

import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Comment } from "../models/Comment";
import { Document } from "../models/Document";
import { DocumentVersion } from "../models/DocumentVersion";
import { StarredDoc } from "../models/StarredDoc";
import { User } from "../models/User";
import { AppError } from "../utils/errors";
import { DocAccessRequest } from "../middleware/checkDocAccess";

const DEFAULT_CONTENT = { ops: [] };
const MAX_VERSIONS = 10;

export const listTrashed = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const docs = await Document.find({ owner: userId, deletedAt: { $ne: undefined } })
      .sort({ deletedAt: -1 })
      .select("title owner version updatedAt deletedAt lastEditedBy")
      .lean();
    res.json({ success: true, documents: docs });
  } catch (e) {
    next(e);
  }
};

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

export const listStarred = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const starred = await StarredDoc.find({ user: userId })
      .select("document")
      .lean();
    const docIds = starred.map((s) => s.document);
    const docs = await Document.find({
      _id: { $in: docIds },
      deletedAt: undefined,
    })
      .sort({ updatedAt: -1 })
      .select("title owner collaborators version updatedAt lastEditedBy")
      .populate("owner", "name email")
      .lean();
    res.json({ success: true, documents: docs });
  } catch (e) {
    next(e);
  }
};

export const starDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const doc = req.doc;
    if (!doc) throw new AppError("Document not found.", 404);
    await StarredDoc.findOneAndUpdate(
      { user: userId, document: docId },
      { user: userId, document: docId },
      { upsert: true, new: true }
    );
    res.json({ success: true, starred: true });
  } catch (e) {
    next(e);
  }
};

export const unstarDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    await StarredDoc.deleteOne({ user: userId, document: docId });
    res.json({ success: true, starred: false });
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

export const setVisibility = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    if (req.docRole !== "owner") {
      throw new AppError("Only the owner can change link sharing.", 403);
    }
    const isPublic = req.body.isPublic === true;
    const publicRole = req.body.publicRole === "editor" ? "editor" : "viewer";
    await Document.findByIdAndUpdate(docId, {
      isPublic,
      publicRole,
      updatedAt: new Date(),
    });
    const updated = await Document.findById(docId)
      .select("isPublic publicRole")
      .lean();
    res.json({ success: true, isPublic: updated?.isPublic, publicRole: updated?.publicRole });
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
      await StarredDoc.deleteMany({ document: docId });
      res.json({ success: true, message: "Document deleted permanently." });
    }
  } catch (e) {
    next(e);
  }
};

export const restoreDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const doc = await Document.findById(docId).select("owner deletedAt").lean();
    if (!doc) throw new AppError("Document not found.", 404);
    const ownerId = String(doc.owner);
    if (ownerId !== userId) throw new AppError("Only the owner can restore this document.", 403);
    if (!doc.deletedAt) throw new AppError("Document is not in trash.", 400);
    await Document.findByIdAndUpdate(docId, {
      $unset: { deletedAt: "" },
      $set: { updatedAt: new Date() },
    });
    const updated = await Document.findById(docId)
      .select("title owner version updatedAt _id")
      .populate("owner", "name email")
      .lean();
    res.json({ success: true, document: updated });
  } catch (e) {
    next(e);
  }
};

export const permanentDeleteDocument = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const doc = await Document.findById(docId).select("owner deletedAt").lean();
    if (!doc) throw new AppError("Document not found.", 404);
    const ownerId = String(doc.owner);
    if (ownerId !== userId) throw new AppError("Only the owner can permanently delete this document.", 403);
    if (!doc.deletedAt) throw new AppError("Document must be in trash before permanent delete.", 400);
    await Document.findByIdAndDelete(docId);
    await DocumentVersion.deleteMany({ document: docId });
    await StarredDoc.deleteMany({ document: docId });
    await Comment.deleteMany({ document: docId });
    res.json({ success: true, message: "Document deleted permanently." });
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

export const listComments = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const comments = await Comment.find({ document: docId })
      .sort({ createdAt: 1 })
      .populate("user", "name email")
      .lean();
    res.json({ success: true, comments });
  } catch (e) {
    next(e);
  }
};

export const addComment = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const userId = req.user!.id;
    const content = (req.body.content as string)?.trim();
    if (!content) throw new AppError("Comment content is required.", 400);
    const comment = await Comment.create({
      document: docId,
      user: userId,
      content,
    });
    const populated = await Comment.findById(comment._id)
      .populate("user", "name email")
      .lean();
    res.status(201).json({ success: true, comment: populated });
  } catch (e) {
    next(e);
  }
};

export const deleteComment = async (
  req: DocAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user!.id;
    const comment = await Comment.findOne({ _id: commentId, document: docId }).lean();
    if (!comment) throw new AppError("Comment not found.", 404);
    const doc = await Document.findById(docId).select("owner").lean();
    if (!doc) throw new AppError("Document not found.", 404);
    const ownerId = String(doc.owner);
    const commentUserId = String(comment.user);
    if (commentUserId !== userId && ownerId !== userId) {
      throw new AppError("You can only delete your own comments.", 403);
    }
    await Comment.deleteOne({ _id: commentId, document: docId });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
