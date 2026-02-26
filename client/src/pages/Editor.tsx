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
  const [titleInput, setTitleInput] = useState("");
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [versions, setVersions] = useState<{ _id: string; version: number; savedBy?: { name?: string }; createdAt?: string }[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"viewer" | "editor">("editor");
  const [shareError, setShareError] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publicRole, setPublicRole] = useState<"viewer" | "editor">("viewer");
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [editorMode, setEditorMode] = useState<"view" | "edit">("edit");
  const [editorModeSelectorOpen, setEditorModeSelectorOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<{ user?: { _id?: string; name?: string; email?: string }; role?: string }[]>([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [comments, setComments] = useState<{ _id: string; content: string; user?: { _id?: string; name?: string; email?: string }; createdAt?: string }[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [addCommentLoading, setAddCommentLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const editorModeBoxRef = useRef<HTMLDivElement | null>(null);
  const quillInitialized = useRef(false);
  const roleRef = useRef<DocRole | null>(null);
  roleRef.current = role;

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
        const t = doc?.title ?? "Untitled";
        setDocTitle(t);
        setTitleInput(t);
        setIsPublic(!!doc?.isPublic);
        setPublicRole(doc?.publicRole === "editor" ? "editor" : "viewer");
      })
      .catch(() => {
        if (!cancelled) navigate("/", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, navigate]);

  const handleHistoryOpen = () => {
    setVersionHistoryOpen(true);
    if (documentId) {
      docsApi.getVersions(documentId).then((r) => setVersions(r.data.versions || [])).catch(() => {});
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!documentId || !quill) return;
    try {
      const { data } = await docsApi.restoreVersion(documentId, versionId);
      if (data.document?.content) {
        quill.setContents(data.document.content as Parameters<Quill["setContents"]>[0]);
      }
      setVersionHistoryOpen(false);
    } catch {
      // ignore
    }
  };

  const handleCommentsOpen = () => {
    setCommentsPanelOpen(true);
    if (documentId) {
      setCommentsLoading(true);
      docsApi
        .listComments(documentId)
        .then((r) => setComments(r.data.comments || []))
        .catch(() => setComments([]))
        .finally(() => setCommentsLoading(false));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !newCommentText.trim() || addCommentLoading) return;
    setAddCommentLoading(true);
    try {
      const { data } = await docsApi.addComment(documentId, newCommentText.trim());
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewCommentText("");
      }
    } catch {
      // ignore
    } finally {
      setAddCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!documentId) return;
    try {
      await docsApi.deleteComment(documentId, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!shareMenuOpen || !documentId) return;
    setCollaboratorsLoading(true);
    docsApi
      .getCollaborators(documentId)
      .then((r) => setCollaborators(r.data.collaborators || []))
      .catch(() => setCollaborators([]))
      .finally(() => setCollaboratorsLoading(false));
  }, [shareMenuOpen, documentId]);

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !shareEmail.trim()) return;
    setShareError("");
    setShareLoading(true);
    try {
      await docsApi.share(documentId, shareEmail.trim(), shareRole);
      const { data } = await docsApi.getCollaborators(documentId);
      setCollaborators(data.collaborators || []);
      setShareEmail("");
      setShareMenuOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setShareError(msg || "Failed to share.");
    } finally {
      setShareLoading(false);
    }
  };

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
    const canEdit = role === "owner" || role === "editor";
    if (canEdit && editorMode === "edit") {
      quill.enable();
    } else {
      quill.disable();
    }
  }, [quill, role, editorMode]);

  useEffect(() => {
    if (!editorModeSelectorOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (editorModeBoxRef.current && !editorModeBoxRef.current.contains(e.target as Node)) {
        setEditorModeSelectorOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [editorModeSelectorOpen]);

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

  const handleTitleBlur = () => {
    const t = titleInput.trim() || "Untitled";
    if (documentId && (role === "owner" || role === "editor") && t !== docTitle) {
      docsApi.updateTitle(documentId, t).then(() => setDocTitle(t)).catch(() => {});
    }
  };

  const displayUsers: { _id: string; name?: string; email?: string; isYou?: boolean }[] = [
    ...(user?.id
      ? [{ _id: user.id, name: user.name, email: user.email, isYou: true as const }]
      : []),
    ...activeUsers.filter((u) => u._id !== user?.id).map((u) => ({ ...u, isYou: false as const })),
  ];

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display antialiased overflow-hidden">
      {/* Top bar - Premium Editor style */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-border-dark px-6 py-3 bg-white dark:bg-surface-dark z-20 shadow-sm relative shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer group"
            aria-label="Back to dashboard"
          >
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight hidden sm:block">
              CollaboWrite
            </h2>
          </button>
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block shrink-0" />
          <div className="flex flex-col min-w-0">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleBlur}
              disabled={role === "viewer"}
              className="bg-transparent border-none p-0 text-sm font-medium text-slate-900 dark:text-white focus:ring-0 w-48 sm:w-64 md:w-80 truncate hover:bg-slate-100 dark:hover:bg-white/5 rounded px-1 transition-colors disabled:opacity-70"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 px-1 flex items-center gap-2 flex-wrap">
              {saving ? "Saving..." : saved ? "Saved to cloud" : "Unsaved changes"}
              {role === "owner" && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (documentId && window.confirm("Delete this document? It will be moved to trash.")) {
                        docsApi.delete(documentId).then(() => navigate("/")).catch(() => {});
                      }
                    }}
                    className="text-red-600 dark:text-red-400 hover:underline text-xs font-medium"
                  >
                    Delete
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center -space-x-2" title={displayUsers.length ? `${displayUsers.length} viewing` : undefined}>
            {displayUsers.slice(0, 5).map((u) => (
              <div
                key={u._id}
                className="relative size-8 rounded-full border-2 border-white dark:border-surface-dark bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xs font-semibold overflow-hidden shrink-0"
                title={u.isYou ? "You" : u.name || u.email}
              >
                {(u.name || u.email || "?").charAt(0).toUpperCase()}
                {u.isYou && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-medium px-1 rounded leading-tight">
                    You
                  </span>
                )}
              </div>
            ))}
            {displayUsers.length > 5 && (
              <div className="flex items-center justify-center size-8 rounded-full border-2 border-white dark:border-surface-dark bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                +{displayUsers.length - 5}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleHistoryOpen}
            className="size-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Version history"
            aria-label="Version history"
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
          </button>
          <button
            type="button"
            onClick={() => (commentsPanelOpen ? setCommentsPanelOpen(false) : handleCommentsOpen())}
            className={`size-9 flex items-center justify-center rounded-lg transition-colors ${commentsPanelOpen ? "bg-slate-100 dark:bg-white/10 text-primary" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            title="Comments"
            aria-label="Comments"
          >
            <span className="material-symbols-outlined text-[20px]">comment</span>
          </button>
          {role === "owner" && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShareMenuOpen((o) => !o)}
                className={`size-9 flex items-center justify-center rounded-lg transition-colors ${shareMenuOpen ? "bg-primary/10 text-primary" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                title="Share"
                aria-label="Share"
              >
                <span className="material-symbols-outlined text-[20px]">person_add</span>
              </button>
              {shareMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setShareMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-72 z-20 rounded-xl border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark shadow-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Share</h3>
                    <div className="space-y-3 mb-4">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        General access
                      </label>
                      <select
                        value={isPublic ? (publicRole === "editor" ? "edit" : "view") : "restricted"}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!documentId) return;
                          const newPublic = v !== "restricted";
                          const newRole = v === "edit" ? "editor" : "viewer";
                          setVisibilityLoading(true);
                          docsApi
                            .setVisibility(documentId, newPublic, newRole)
                            .then(() => {
                              setIsPublic(newPublic);
                              setPublicRole(newRole);
                            })
                            .catch(() => {})
                            .finally(() => setVisibilityLoading(false));
                        }}
                        disabled={visibilityLoading}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                      >
                        <option value="restricted">Restricted (only people added can open)</option>
                        <option value="view">Anyone with the link can view</option>
                        <option value="edit">Anyone with the link can edit</option>
                      </select>
                    </div>
                    <div className="border-t border-slate-200 dark:border-border-dark pt-3 mb-3">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                        People with access
                      </label>
                      {collaboratorsLoading ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Loading…</p>
                      ) : collaborators.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Not shared with anyone yet.</p>
                      ) : (
                        <ul className="space-y-2 max-h-32 overflow-y-auto">
                          {collaborators.map((c) => (
                            <li
                              key={c.user?._id ?? String(Math.random())}
                              className="flex items-center justify-between gap-2 text-sm group"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-slate-700 dark:text-slate-300">
                                  {c.user?.name || c.user?.email || "—"}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                  {c.role === "editor" ? "Can edit" : "Can view"}
                                </span>
                              </div>
                              {c.user?._id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!documentId) return;
                                    docsApi.unshare(documentId, String(c.user?._id)).then(() => {
                                      setCollaborators((prev) => prev.filter((x) => x.user?._id !== c.user?._id));
                                    }).catch(() => {});
                                  }}
                                  className="shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                  aria-label="Remove access"
                                >
                                  <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="border-t border-slate-200 dark:border-border-dark pt-3">
                      <label htmlFor="share-email-editor" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Add people
                      </label>
                      <form onSubmit={handleShareSubmit} className="space-y-3">
                        <input
                          id="share-email-editor"
                          type="email"
                          value={shareEmail}
                          onChange={(e) => setShareEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div>
                          <label htmlFor="share-role-editor" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Permission
                        </label>
                        <select
                          id="share-role-editor"
                          value={shareRole}
                          onChange={(e) => setShareRole(e.target.value as "viewer" | "editor")}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="viewer">Can view</option>
                          <option value="editor">Can edit</option>
                        </select>
                        </div>
                        {shareError && (
                        <p className="text-xs text-red-500">{shareError}</p>
                      )}
                      <button
                        type="submit"
                        disabled={shareLoading || !shareEmail.trim()}
                        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {shareLoading ? "Sharing..." : "Share"}
                      </button>
                    </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Version history panel */}
      {versionHistoryOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            aria-hidden
            onClick={() => setVersionHistoryOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-full z-40 bg-white dark:bg-surface-dark border-l border-slate-200 dark:border-border-dark shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-border-dark">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Version history</h3>
              <button
                type="button"
                onClick={() => setVersionHistoryOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
              {versions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No versions yet.</p>
              ) : (
                versions
                  .slice()
                  .sort((a, b) => (b.version || 0) - (a.version || 0))
                  .map((v) => (
                    <div
                      key={v._id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Version {v.version}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {v.savedBy?.name ? `Saved by ${v.savedBy.name}` : ""}
                          {v.createdAt ? ` · ${new Date(v.createdAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      {(role === "owner" || role === "editor") && (
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(v._id)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Comments panel */}
      {commentsPanelOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-80 max-w-full z-30 bg-white dark:bg-surface-dark border-l border-slate-200 dark:border-border-dark shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-border-dark">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Comments</h3>
            <button
              type="button"
              onClick={() => setCommentsPanelOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {commentsLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c._id}
                    className="rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50/50 dark:bg-white/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                          {c.user?.name || c.user?.email || "Unknown"}
                        </p>
                        <p className="text-sm text-slate-900 dark:text-white mt-1 break-words whitespace-pre-wrap">
                          {c.content}
                        </p>
                        {c.createdAt && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {new Date(c.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {user && (String(c.user?._id) === user.id || role === "owner") && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c._id)}
                          className="shrink-0 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                          aria-label="Delete comment"
                        >
                          <span className="material-symbols-outlined text-lg">delete_outline</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleAddComment} className="p-4 border-t border-slate-200 dark:border-border-dark shrink-0">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                className="w-full rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={addCommentLoading}
              />
              <button
                type="submit"
                disabled={!newCommentText.trim() || addCommentLoading}
                className="mt-2 w-full py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                {addCommentLoading ? "Adding…" : "Add comment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main: optional outline sidebar + editor + optional comments */}
      <main className="flex-1 flex overflow-hidden relative min-h-0">
        <aside className="w-64 border-r border-slate-200 dark:border-border-dark bg-white/50 dark:bg-surface-dark/30 backdrop-blur-sm hidden lg:flex flex-col py-6 px-4 shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-2">
            Outline
          </h3>
          <nav className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <p className="px-2 py-1.5 text-slate-400 dark:text-slate-500">No headings yet</p>
          </nav>
          <div
            ref={editorModeBoxRef}
            role={role === "owner" || role === "editor" ? "button" : undefined}
            tabIndex={role === "owner" || role === "editor" ? 0 : undefined}
            onClick={() => (role === "owner" || role === "editor" ? setEditorModeSelectorOpen((o) => !o) : undefined)}
            onKeyDown={(e) => {
              if ((role === "owner" || role === "editor") && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setEditorModeSelectorOpen((o) => !o);
              }
            }}
            className={`mt-auto p-3 rounded-lg border border-blue-100 dark:border-primary/20 ${role === "owner" || role === "editor" ? "cursor-pointer bg-blue-50 dark:bg-primary/10 hover:bg-blue-100/80 dark:hover:bg-primary/15" : "bg-blue-50 dark:bg-primary/10"}`}
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0">info</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-900 dark:text-white mb-1">
                  {role === "viewer" ? "Viewing" : editorMode === "edit" ? "Editing Mode" : "Viewing Mode"}
                </p>
                {role === "owner" || role === "editor" ? (
                  <>
                    {editorModeSelectorOpen && (
                      <select
                        value={editorMode}
                        onChange={(e) => setEditorMode(e.target.value as "view" | "edit")}
                        className="mt-1 w-full rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                      </select>
                    )}
                    <p className="text-[11px] leading-tight text-slate-600 dark:text-slate-400 mt-2">
                      {editorMode === "edit" ? "Changes are automatically saved." : "Switch to Edit to make changes."}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] leading-tight text-slate-600 dark:text-slate-400">
                    You can view this document.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto relative scroll-smooth bg-background-light dark:bg-background-dark min-w-0 flex flex-col">
          <div
            className="editorContainer flex-1 min-h-0"
            ref={(el) => {
              wrapperRef.current = el;
              wrapperCallback(el);
            }}
          />
        </div>
      </main>
    </div>
  );
}
