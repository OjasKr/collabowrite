"use strict";

import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many login attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
