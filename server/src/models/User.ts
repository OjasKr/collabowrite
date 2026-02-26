"use strict";

import mongoose from "mongoose";

export interface IUser {
  name: string;
  email: string;
  password: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    bio: { type: String, default: undefined, trim: true },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
