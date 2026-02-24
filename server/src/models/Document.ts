"use strict";

import mongoose from "mongoose";

export type CollaboratorRole = "viewer" | "editor";

export interface ICollaborator {
  user: mongoose.Types.ObjectId;
  role: CollaboratorRole;
}

export interface IDocument {
  title: string;
  content: object;
  owner: mongoose.Types.ObjectId;
  collaborators: ICollaborator[];
  isPublic: boolean;
  version: number;
  lastEditedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const collaboratorSchema = new mongoose.Schema<ICollaborator>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["viewer", "editor"], required: true },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema<IDocument>(
  {
    title: { type: String, required: true, default: "Untitled", trim: true },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    collaborators: { type: [collaboratorSchema], default: [] },
    isPublic: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: undefined },
  },
  { timestamps: true }
);

documentSchema.index({ owner: 1, updatedAt: -1 });
documentSchema.index({ "collaborators.user": 1, updatedAt: -1 });
documentSchema.index({ deletedAt: 1 });

export const Document = mongoose.model<IDocument>("Document", documentSchema);
