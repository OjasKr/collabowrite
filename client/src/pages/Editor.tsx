import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io, Socket } from "socket.io-client";
import { TOOLBAR_OPTIONS } from "../constants";
import { docsApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const SAVE_DEBOUNCE_MS = 2500;

type DocRole = "owner" | "editor" | "viewer";

interface ActiveUser {
  _id: string;
  name?: string;
  email?: string;
}

export const Editor = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [quill, setQuill] = useState<Quill | null>(null);
  const [role, setRole] = useState<DocRole | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const quillInitialized = useRef(false);

  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  useEffect(() => {
    if (!documentId) {
      navigate("/", { replace: true });
      return;
    }
    const skt = io(serverUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    setSocket(skt);
    return () => {
      skt.disconnect();
    };
  }, [documentId, serverUrl, navigate]);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    docsApi
      .get(documentId)
      .then((res) => {
        if (cancelled) return;
        const doc = res.data.document;
        const r = res.data.role as DocRole;
        setRole(r);
        setDocTitle(doc?.title ?? "Untitled");
      })
      .catch(() => {
        if (!cancelled) navigate("/", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, navigate]);

  const wrapperCallback = useCallback(
    (wrapper: HTMLDivElement | null) => {
      if (!wrapper || quillInitialized.current) return;
      wrapper.innerHTML = "";
      const editor = document.createElement("div");
      wrapper.append(editor);
      const q = new Quill(editor, {
        theme: "snow",
        modules: { toolbar: TOOLBAR_OPTIONS },
      });
      q.disable();
      q.setText("Loading...");
      setQuill(q);
      quillInitialized.current = true;
    },
    []
  );

  useEffect(() => {
    if (!socket || !quill || !documentId) return;

    socket.emit("join-document", documentId);

    socket.on("load-document", (content: object) => {
      quill.setContents(content as Parameters<Quill["setContents"]>[0]);
      quill.enable();
    });

    socket.on("document-error", () => {
      navigate("/", { replace: true });
    });

    socket.on("active-users", (users: ActiveUser[]) => {
      setActiveUsers(Array.isArray(users) ? users : []);
    });

    socket.on("document-saved", () => {
      setSaving(false);
      setSaved(true);
    });

    const textChangeHandler = (delta: unknown, _oldDelta: unknown, source: string) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
      setSaved(false);
    };
    quill.on("text-change", textChangeHandler);

    const receiveHandler = (delta: unknown) => {
      quill.updateContents(delta as Parameters<Quill["updateContents"]>[0]);
    };
    socket.on("receive-changes", receiveHandler);

    let typingTimer: ReturnType<typeof setTimeout> | null = null;
    const emitTyping = () => {
      socket.emit("typing");
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {}, 2000);
    };
    quill.on("text-change", emitTyping);

    return () => {
      if (typingTimer) clearTimeout(typingTimer);
      quill.off("text-change", emitTyping);
      quill.off("text-change", textChangeHandler);
      socket.off("receive-changes", receiveHandler);
      socket.off("load-document");
      socket.off("document-error");
      socket.off("active-users");
      socket.off("document-saved");
    };
  }, [socket, quill, documentId, navigate]);

  useEffect(() => {
    if (!quill || role === null) return;
    if (role === "viewer") {
      quill.disable();
    } else {
      quill.enable();
    }
  }, [quill, role]);

  useEffect(() => {
    if (!socket || !quill || !documentId || role === "viewer") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const saveContent = () => {
      setSaving(true);
      socket.emit("save-document", quill.getContents());
    };

    const handler = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(saveContent, SAVE_DEBOUNCE_MS);
    };
    quill.on("text-change", handler);
    return () => {
      quill.off("text-change", handler);
      if (timer) clearTimeout(timer);
    };
  }, [socket, quill, documentId, role]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
            aria-label="Back to dashboard"
          >
            ←
          </button>
          <span className="font-medium truncate">{docTitle || "Untitled"}</span>
          {role && (
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                role === "owner"
                  ? "bg-primary text-primary-foreground"
                  : role === "editor"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
          {!saving && saved && (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {activeUsers
                .filter((u) => u._id !== user?.id)
                .slice(0, 3)
                .map((u) => (
                  <span
                    key={u._id}
                    className="px-1.5 py-0.5 rounded bg-muted"
                    title={u.email || u.name}
                  >
                    {u.name || u.email || "User"}
                  </span>
                ))}
              {activeUsers.length > 3 && (
                <span>+{activeUsers.length - 3}</span>
              )}
            </div>
          )}
          {documentId && (
            <a
              href={`/documents/${documentId}/settings`}
              className="text-sm text-primary hover:underline"
            >
              Settings
            </a>
          )}
        </div>
      </header>
      <div
        className="editorContainer flex-1 overflow-auto"
        ref={(el) => {
          wrapperRef.current = el;
          wrapperCallback(el);
        }}
      />
    </div>
  );
}
