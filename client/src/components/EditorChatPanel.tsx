import { useState, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface EditorChatPanelProps {
  onSendMessage: (message: string, documentContext?: string) => Promise<string>;
  getDocumentContext?: () => string;
  disabled?: boolean;
  className?: string;
}

export const EditorChatPanel = ({
  onSendMessage,
  getDocumentContext,
  disabled,
  className = "",
}: EditorChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || disabled) return;
    setInput("");
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const context = getDocumentContext?.();
      const result = await onSendMessage(text, context);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I couldn’t get a response. Please try again.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col flex-1 min-h-0 ${className}`}
      aria-label="AI assistant chat"
    >
      <div className="flex items-center gap-2 mb-3 px-2">
        <span className="material-symbols-outlined text-primary text-lg">
          smart_toy
        </span>
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Assistant
        </h3>
      </div>
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1"
      >
        {messages.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 px-2 py-2">
            Ask for help with writing, structure, or ideas. I can use your
            document as context if you’re editing.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-100"
              }`}
            >
              <span className="whitespace-pre-wrap break-words">{m.content}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] animate-pulse">
                progress_activity
              </span>
              Thinking…
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            disabled={loading || disabled}
            className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-surface-dark px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
            aria-label="Chat message"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || disabled}
            className="shrink-0 size-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            aria-label="Send message"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
