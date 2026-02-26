"use strict";

import { Response, NextFunction } from "express";
import { generateAIResponse, generateChatResponse } from "../utils/ai.service";
import { AppError } from "../utils/errors";
import { AuthenticatedRequest } from "../middleware/requireAuth";

const MAX_TEXT_LENGTH = 3000;
const AI_CACHE_TTL_MS = 60 * 1000;

const aiCache = new Map<
  string,
  { result: string; at: number }
>();

function getCacheKey(docId: string | undefined, type: string): string | null {
  if (!docId || typeof docId !== "string" || !docId.trim()) return null;
  return `${docId.trim()}:${type}`;
}

function getCached(key: string): string | null {
  const entry = aiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > AI_CACHE_TTL_MS) {
    aiCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCached(key: string, result: string): void {
  aiCache.set(key, { result, at: Date.now() });
}

function getTextFromBody(req: AuthenticatedRequest): string {
  const body = req.body as { text?: unknown };
  const text = typeof body?.text === "string" ? body.text : "";
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AppError("Text is required and cannot be empty.", 400);
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new AppError(`Text must be at most ${MAX_TEXT_LENGTH} characters.`, 400);
  }
  return trimmed;
}

function getDocIdFromBody(req: AuthenticatedRequest): string | undefined {
  const body = req.body as { documentId?: unknown };
  return typeof body?.documentId === "string" ? body.documentId : undefined;
}

export async function chat(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as { message?: unknown; documentContext?: unknown };
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const documentContext =
      typeof body?.documentContext === "string" ? body.documentContext : undefined;
    if (!message) {
      throw new AppError("Message is required and cannot be empty.", 400);
    }
    const result = await generateChatResponse(
      message,
      documentContext,
      req.user?.id
    );
    res.json({ success: true, result });
  } catch (e) {
    next(e);
  }
}

export async function refineText(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const text = getTextFromBody(req);
    const docId = getDocIdFromBody(req);
    const cacheKey = getCacheKey(docId, "refine");
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached !== null) {
        res.json({ success: true, result: cached });
        return;
      }
    }
    const prompt = `Improve the following text for grammar and clarity. Keep the same meaning and tone. Output only the improved text, no explanations.\n\n${text}`;
    const result = await generateAIResponse(prompt, req.user?.id);
    if (cacheKey) setCached(cacheKey, result);
    res.json({ success: true, result });
  } catch (e) {
    next(e);
  }
}

export async function summarizeText(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const text = getTextFromBody(req);
    const docId = getDocIdFromBody(req);
    const cacheKey = getCacheKey(docId, "summarize");
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached !== null) {
        res.json({ success: true, result: cached });
        return;
      }
    }
    const prompt = `Summarize the following text as bullet points. Be concise. Output only the bullet list, no intro or outro.\n\n${text}`;
    const result = await generateAIResponse(prompt, req.user?.id);
    if (cacheKey) setCached(cacheKey, result);
    res.json({ success: true, result });
  } catch (e) {
    next(e);
  }
}

export async function rewriteProfessional(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const text = getTextFromBody(req);
    const docId = getDocIdFromBody(req);
    const cacheKey = getCacheKey(docId, "rewrite");
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached !== null) {
        res.json({ success: true, result: cached });
        return;
      }
    }
    const prompt = `Rewrite the following text in a professional, formal tone. Keep the same meaning. Output only the rewritten text.\n\n${text}`;
    const result = await generateAIResponse(prompt, req.user?.id);
    if (cacheKey) setCached(cacheKey, result);
    res.json({ success: true, result });
  } catch (e) {
    next(e);
  }
}

export async function expandText(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const text = getTextFromBody(req);
    const docId = getDocIdFromBody(req);
    const cacheKey = getCacheKey(docId, "expand");
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached !== null) {
        res.json({ success: true, result: cached });
        return;
      }
    }
    const prompt = `Expand the following text with more detail and explanation. Keep the same tone and style. Output only the expanded text.\n\n${text}`;
    const result = await generateAIResponse(prompt, req.user?.id);
    if (cacheKey) setCached(cacheKey, result);
    res.json({ success: true, result });
  } catch (e) {
    next(e);
  }
}

export async function generateTitle(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const text = getTextFromBody(req);
    const docId = getDocIdFromBody(req);
    const cacheKey = getCacheKey(docId, "title");
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached !== null) {
        res.json({ success: true, result: cached });
        return;
      }
    }
    const prompt = `Suggest a short, clear document title (max 10 words) based on the following content. Output only the title, nothing else.\n\n${text}`;
    const result = await generateAIResponse(prompt, req.user?.id);
    const trimmed = result.trim();
    if (cacheKey) setCached(cacheKey, trimmed);
    res.json({ success: true, result: trimmed });
  } catch (e) {
    next(e);
  }
}

export async function detectTone(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const text = getTextFromBody(req);
    const docId = getDocIdFromBody(req);
    const cacheKey = getCacheKey(docId, "tone");
    if (cacheKey) {
      const cached = getCached(cacheKey);
      if (cached !== null) {
        res.json({ success: true, result: cached });
        return;
      }
    }
    const prompt = `Identify the tone of the following text in one or two words (e.g. Formal, Casual, Persuasive, Informative, Friendly). Output only the tone label(s), nothing else.\n\n${text}`;
    const result = await generateAIResponse(prompt, req.user?.id);
    const trimmed = result.trim();
    if (cacheKey) setCached(cacheKey, trimmed);
    res.json({ success: true, result: trimmed });
  } catch (e) {
    next(e);
  }
}
