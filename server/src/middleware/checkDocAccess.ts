"use strict";

import { Response, NextFunction } from "express";
import { Document } from "../models/Document";
import { AppError } from "../utils/errors";
import { AuthenticatedRequest } from "./requireAuth";

export type DocAccessRole = "owner" | "editor" | "viewer";

export interface DocAccessRequest extends AuthenticatedRequest {
  doc?: Awaited<ReturnType<typeof Document.findById>>;
  docRole?: DocAccessRole;
}

export const checkDocAccess = async (
  req: DocAccessRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId = req.params.id;
    if (!docId) {
      throw new AppError("Document ID required.", 400);
    }
    const doc = await Document.findById(docId)
      .populate("owner", "name email")
      .lean();
    if (!doc) {
      throw new AppError("Document not found.", 404);
    }
    if (doc.deletedAt) {
      throw new AppError("Document not found.", 404);
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required.", 401);
    }
    const owner = doc.owner as unknown;
    const ownerId =
      typeof owner === "object" && owner !== null && "_id" in owner
        ? String((owner as { _id: unknown })._id)
        : String(owner);
    if (ownerId === userId) {
      req.doc = doc as DocAccessRequest["doc"];
      req.docRole = "owner";
      next();
      return;
    }
    if (doc.isPublic) {
      req.doc = doc as DocAccessRequest["doc"];
      req.docRole = "viewer";
      next();
      return;
    }
    const collab = doc.collaborators?.find(
      (c) => (c.user as unknown as string)?.toString?.() === userId
    );
    if (collab) {
      req.doc = doc as DocAccessRequest["doc"];
      req.docRole = collab.role as DocAccessRole;
      next();
      return;
    }
    throw new AppError("You do not have access to this document.", 403);
  } catch (e) {
    next(e);
  }
};
