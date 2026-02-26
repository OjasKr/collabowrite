import { api } from "./api";

export interface AIResultResponse {
  success: boolean;
  result: string;
}

interface AIBody {
  text: string;
  documentId?: string;
}

export const aiApi = {
  refine: (text: string, documentId?: string) =>
    api.post<AIResultResponse>("/ai/refine", { text, documentId } as AIBody),

  summarize: (text: string, documentId?: string) =>
    api.post<AIResultResponse>("/ai/summarize", { text, documentId } as AIBody),

  rewrite: (text: string, documentId?: string) =>
    api.post<AIResultResponse>("/ai/rewrite", { text, documentId } as AIBody),

  expand: (text: string, documentId?: string) =>
    api.post<AIResultResponse>("/ai/expand", { text, documentId } as AIBody),

  generateTitle: (text: string, documentId?: string) =>
    api.post<AIResultResponse>("/ai/title", { text, documentId } as AIBody),

  detectTone: (text: string, documentId?: string) =>
    api.post<AIResultResponse>("/ai/tone", { text, documentId } as AIBody),

  chat: (message: string, documentContext?: string) =>
    api.post<AIResultResponse>("/ai/chat", { message, documentContext }),
};
