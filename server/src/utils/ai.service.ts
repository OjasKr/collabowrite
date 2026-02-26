"use strict";

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { AppError } from "./errors";

const MAX_INPUT_LENGTH = 3000;
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel | null {
  if (model) return model;
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (key && typeof key === "string" && key.trim().length > 0) {
    const modelName =
      process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
    const genAI = new GoogleGenerativeAI(key.trim());
    model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { maxOutputTokens: 2048 },
    });
  }
  return model;
}

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const entry = requestCounts.get(userId);
  if (!entry) {
    requestCounts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  if (now >= entry.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    throw new AppError("Too many AI requests. Please try again later.", 429);
  }
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiModel = getModel();
  if (!apiModel) {
    throw new AppError("AI service is not configured.", 503);
  }
  const result = await apiModel.generateContent(prompt);
  const response = result.response;
  if (!response) {
    throw new AppError("AI did not return a valid response.", 502);
  }
  const text = response.text();
  if (text == null || typeof text !== "string") {
    throw new AppError("AI did not return a valid response.", 502);
  }
  return text.trim();
}

export async function generateAIResponse(
  prompt: string,
  userId?: string
): Promise<string> {
  if (!getModel()) {
    throw new AppError("AI service is not configured.", 503);
  }
  const trimmed = typeof prompt === "string" ? prompt.trim() : "";
  if (!trimmed) {
    throw new AppError("Input text is required.", 400);
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    throw new AppError(
      `Input must be at most ${MAX_INPUT_LENGTH} characters.`,
      400
    );
  }
  if (userId) {
    checkRateLimit(userId);
  }
  try {
    return await generateWithGemini(trimmed);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : "AI request failed.";
    throw new AppError(message, 502);
  }
}

const MAX_CHAT_MESSAGE_LENGTH = 3000;
const MAX_CHAT_CONTEXT_LENGTH = 4000;
const CHAT_SYSTEM_INSTRUCTION =
  "You are a helpful writing assistant in CollaboWrite, a collaborative document editor. Help with writing, editing, structure, and ideas. If the user shares document content, you may reference it. Reply in a concise, helpful way. Do not repeat the document back; focus on answering or advising.";

export async function generateChatResponse(
  userMessage: string,
  documentContext: string | undefined,
  userId?: string
): Promise<string> {
  const apiModel = getModel();
  if (!apiModel) {
    throw new AppError("AI service is not configured.", 503);
  }
  const trimmed = typeof userMessage === "string" ? userMessage.trim() : "";
  if (!trimmed) {
    throw new AppError("Message is required and cannot be empty.", 400);
  }
  if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
    throw new AppError(
      `Message must be at most ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
      400
    );
  }
  const context =
    typeof documentContext === "string" && documentContext.trim().length > 0
      ? documentContext.trim().slice(0, MAX_CHAT_CONTEXT_LENGTH)
      : undefined;
  if (userId) {
    checkRateLimit(userId);
  }
  const userContent = context
    ? `[Current document content for context]\n${context}\n\n[User question]\n${trimmed}`
    : trimmed;
  const fullPrompt = `${CHAT_SYSTEM_INSTRUCTION}\n\n---\n\n${userContent}`;
  try {
    return await generateWithGemini(fullPrompt);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : "Chat request failed.";
    throw new AppError(message, 502);
  }
}
