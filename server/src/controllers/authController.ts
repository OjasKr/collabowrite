"use strict";

import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body } from "express-validator";
import { User } from "../models/User";
import { AppError } from "../utils/errors";
import { validateRequest } from "../middleware/validateRequest";

const ACCESS_EXPIRY = "15m";
const REFRESH_EXPIRY = "7d";
const REFRESH_COOKIE_NAME = "refreshToken";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

export const registerValidators = [
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("email").trim().isEmail().withMessage("Valid email is required.").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),
];

export const loginValidators = [
  body("email").trim().isEmail().withMessage("Valid email is required.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required."),
];

export const register = [
  validateRequest(registerValidators),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      const existing = await User.findOne({ email }).lean();
      if (existing) {
        throw new AppError("An account with this email already exists.", 409);
      }
      const hashed = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, password: hashed });
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_ACCESS_SECRET || "access-secret",
        { expiresIn: ACCESS_EXPIRY }
      );
      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET || "refresh-secret",
        { expiresIn: REFRESH_EXPIRY }
      );
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      res.status(201).json({
        success: true,
        user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
        accessToken,
        expiresIn: 900,
      });
    } catch (e) {
      next(e);
    }
  },
];

export const login = [
  validateRequest(loginValidators),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password").lean();
      if (!user || !user.password) {
        throw new AppError("Invalid email or password.", 401);
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        throw new AppError("Invalid email or password.", 401);
      }
      const accessToken = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_ACCESS_SECRET || "access-secret",
        { expiresIn: ACCESS_EXPIRY }
      );
      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET || "refresh-secret",
        { expiresIn: REFRESH_EXPIRY }
      );
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
      res.json({
        success: true,
        user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
        accessToken,
        expiresIn: 900,
      });
    } catch (e) {
      next(e);
    }
  },
];

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      throw new AppError("Refresh token required.", 401);
    }
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || "refresh-secret"
    ) as { userId: string };
    const user = await User.findById(decoded.userId).select("_id email name avatar").lean();
    if (!user) {
      throw new AppError("User not found.", 401);
    }
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_ACCESS_SECRET || "access-secret",
      { expiresIn: ACCESS_EXPIRY }
    );
    res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
      accessToken,
      expiresIn: 900,
    });
  } catch (e) {
    next(e);
  }
};

export const logout = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as import("../middleware/requireAuth").AuthenticatedRequest;
    if (!authReq.user?.id) {
      throw new AppError("Authentication required.", 401);
    }
    const user = await User.findById(authReq.user.id)
      .select("name email avatar createdAt")
      .lean();
    if (!user) {
      throw new AppError("User not found.", 404);
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    next(e);
  }
};
