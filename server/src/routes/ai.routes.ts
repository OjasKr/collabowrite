"use strict";

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth";
import {
  refineText,
  summarizeText,
  rewriteProfessional,
  expandText,
  generateTitle,
  detectTone,
  chat,
} from "../controllers/ai.controller";

const router = Router();

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many AI requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(requireAuth);
router.use(aiRateLimit);

router.post("/refine", refineText);
router.post("/summarize", summarizeText);
router.post("/rewrite", rewriteProfessional);
router.post("/expand", expandText);
router.post("/title", generateTitle);
router.post("/tone", detectTone);
router.post("/chat", chat);

export default router;
