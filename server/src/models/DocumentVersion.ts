"use strict";

import mongoose from "mongoose";

export interface IDocumentVersion {
  document: mongoose.Types.ObjectId;
  version: number;
  content: object;
  savedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const documentVersionSchema = new mongoose.Schema<IDocumentVersion>(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    version: { type: Number, required: true },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

documentVersionSchema.index({ document: 1, version: -1 });

export const DocumentVersion = mongoose.model<IDocumentVersion>("DocumentVersion", documentVersionSchema);
