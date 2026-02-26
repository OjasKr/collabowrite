"use strict";

import mongoose from "mongoose";

export interface IStarredDoc {
  user: mongoose.Types.ObjectId;
  document: mongoose.Types.ObjectId;
  createdAt: Date;
}

const starredDocSchema = new mongoose.Schema<IStarredDoc>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
  },
  { timestamps: true }
);

starredDocSchema.index({ user: 1, document: 1 }, { unique: true });
starredDocSchema.index({ user: 1 });

export const StarredDoc = mongoose.model<IStarredDoc>("StarredDoc", starredDocSchema);
