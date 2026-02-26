"use strict";

import mongoose from "mongoose";

export interface IComment {
  document: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new mongoose.Schema<IComment>(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

commentSchema.index({ document: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>("Comment", commentSchema);
