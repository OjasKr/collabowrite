"use strict";

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AppError } from "../utils/errors";

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      throw new AppError("Authentication required.", 401);
    }
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || "access-secret"
    ) as AuthPayload;
    const user = await User.findById(decoded.userId).select("_id email").lean();
    if (!user) {
      throw new AppError("User not found.", 401);
    }
    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch (e) {
    next(e);
  }
};
