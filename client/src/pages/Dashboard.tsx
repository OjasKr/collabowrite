import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { docsApi } from "../lib/api";
import type { DashboardView } from "../components/DashboardSidebar";
import { useAuth } from "../context/AuthContext";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { DashboardHeader } from "../components/DashboardHeader";
import { CreateDocumentDialog } from "../components/CreateDocumentDialog";
import { formatRelativeTime } from "../utils/formatRelativeTime";

interface DocItem {
  _id: string;
  title: string;
  owner?: { name: string; email: string };
  version?: number;
  updatedAt?: string;
  deletedAt?: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [myDocs, setMyDocs] = useState<DocItem[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [starredDocs, setStarredDocs] = useState<DocItem[]>([]);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [sharedDocs, setSharedDocs] = useState<DocItem[]>([]);
  const [trashedDocs, setTrashedDocs] = useState<DocItem[]>([]);
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const view: DashboardView =
    viewParam === "my-documents" || viewParam === "starred" || viewParam === "shared" || viewParam === "trash"
      ? viewParam
      : "home";
  const navigate = useNavigate();

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      docsApi.list().then((r) => r.data.documents || []),
      docsApi.listRecent().then((r) => r.data.documents || []),
      docsApi.listStarred().then((r) => r.data.documents || []),
      docsApi.listShared().then((r) => r.data.documents || []),
      docsApi.listTrash().then((r) => r.data.documents || []),
    ])
      .then(([my, recent, starred, shared, trashed]) => {
        setMyDocs(my);
        setRecentDocs(recent);
        setStarredDocs(starred);
        setStarredIds(new Set((starred as DocItem[]).map((d) => d._id)));
        setSharedDocs(shared);
        setTrashedDocs(trashed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const byLatestFirst = (a: DocItem, b: DocItem) =>
    new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();

  const handleStarToggle = async (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isStarred = starredIds.has(docId);
    try {
      if (isStarred) {
        await docsApi.unstar(docId);
        setStarredIds((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
        setStarredDocs((prev) => prev.filter((d) => d._id !== docId));
      } else {
        await docsApi.star(docId);
        setStarredIds((prev) => new Set(prev).add(docId));
        const allDocsMap = new Map<string, DocItem>();
        [...myDocs, ...recentDocs, ...sharedDocs].forEach((d) => allDocsMap.set(d._id, d));
        const doc = allDocsMap.get(docId);
        if (doc) setStarredDocs((prev) => [...prev.filter((d) => d._id !== docId), doc].sort(byLatestFirst));
      }
    } catch {
      // ignore
    }
  };

  const openDoc = (id: string) => {
    navigate(`/documents/${id}`);
  };

  const sortedMyDocs = [...myDocs].sort(byLatestFirst).slice(0, 3);
  const sortedRecentDocs = [...recentDocs].sort(byLatestFirst).slice(0, 4);
  const sortedStarredDocs = [...starredDocs].sort(byLatestFirst);
  const sortedSharedDocs = [...sharedDocs].sort(byLatestFirst);

  const query = searchQuery.trim().toLowerCase();
  const allDocsMap = new Map<string, DocItem>();
  [...myDocs, ...recentDocs, ...sharedDocs].forEach((d) => allDocsMap.set(d._id, d));
  const searchResults = query
    ? [...allDocsMap.values()].filter((d) =>
        (d.title || "Untitled").toLowerCase().includes(query)
      )
    : [];
  const isSearching = query.length > 0;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-slate-100">
      <CreateDocumentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchAll}
      />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform md:relative md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DashboardSidebar
          onNewDocumentClick={() => {
            setCreateOpen(true);
            setMobileMenuOpen(false);
          }}
          onMobileMenuClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          onMenuClick={() => setMobileMenuOpen(true)}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="max-w-6xl mx-auto flex flex-col gap-10">
          {/* Hero */}
          <div className="rounded-2xl bg-gradient-to-r from-primary to-indigo-700 p-6 text-white shadow-xl dark:shadow-primary/10 md:p-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Welcome back, {user?.name?.split(" ")[0] || "there"}!
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="text-text-secondary">Loading...</div>
          ) : isSearching ? (
            <>
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Search results
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {searchResults.length === 0
                      ? "No documents match your search."
                      : `${searchResults.length} document${searchResults.length === 1 ? "" : "s"} found.`}
                  </p>
                </div>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {searchResults.sort(byLatestFirst).map((doc) => (
                      <DocumentCard
                        key={doc._id}
                        documentId={doc._id}
                        title={doc.title || "Untitled"}
                        updatedAt={doc.updatedAt}
                        onClick={openDoc}
                        isStarred={starredIds.has(doc._id)}
                        onStarToggle={(e) => handleStarToggle(e, doc._id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-surface-highlight bg-white dark:bg-surface-dark p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
                      search_off
                    </span>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">
                      No documents match &quot;{searchQuery.trim()}&quot;
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                      Try a different search term.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : view === "my-documents" ? (
            <>
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    My Documents
                  </h1>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {sortedMyDocs.map((doc) => (
                    <DocumentCard
                      key={doc._id}
                      documentId={doc._id}
                      title={doc.title || "Untitled"}
                      updatedAt={doc.updatedAt}
                      onClick={openDoc}
                      isStarred={starredIds.has(doc._id)}
                      onStarToggle={(e) => handleStarToggle(e, doc._id)}
                    />
                  ))}
                  <NewDocumentCard onClick={() => setCreateOpen(true)} />
                </div>
              </section>
            </>
          ) : view === "shared" ? (
            <>
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Shared With Me
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {sortedSharedDocs.length === 0
                      ? "Documents shared with you will appear here."
                      : `${sortedSharedDocs.length} document${sortedSharedDocs.length === 1 ? "" : "s"} shared with you.`}
                  </p>
                </div>
                {sortedSharedDocs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {sortedSharedDocs.map((doc) => (
                      <DocumentCard
                        key={doc._id}
                        documentId={doc._id}
                        title={doc.title || "Untitled"}
                        updatedAt={doc.updatedAt}
                        onClick={openDoc}
                        isStarred={starredIds.has(doc._id)}
                        onStarToggle={(e) => handleStarToggle(e, doc._id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-surface-highlight bg-white dark:bg-surface-dark p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
                      group
                    </span>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">
                      No documents shared with you yet.
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                      When someone shares a document with you, it will appear here.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : view === "starred" ? (
            <>
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Starred
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {sortedStarredDocs.length === 0
                      ? "Star documents to find them quickly here."
                      : `${sortedStarredDocs.length} document${sortedStarredDocs.length === 1 ? "" : "s"} starred.`}
                  </p>
                </div>
                {sortedStarredDocs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {sortedStarredDocs.map((doc) => (
                      <DocumentCard
                        key={doc._id}
                        documentId={doc._id}
                        title={doc.title || "Untitled"}
                        updatedAt={doc.updatedAt}
                        onClick={openDoc}
                        isStarred
                        onStarToggle={(e) => handleStarToggle(e, doc._id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-surface-highlight bg-white dark:bg-surface-dark p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
                      star
                    </span>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">
                      No starred documents yet.
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                      Click the star on any document to add it here.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : view === "trash" ? (
            <>
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Trash
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {trashedDocs.length === 0
                      ? "Deleted documents will appear here."
                      : `${trashedDocs.length} document${trashedDocs.length === 1 ? "" : "s"} in trash.`}
                  </p>
                </div>
                {trashedDocs.length > 0 ? (
                  <div className="space-y-2">
                    {trashedDocs.map((doc) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-surface-highlight bg-white dark:bg-surface-dark p-4 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {doc.title || "Untitled"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Deleted {formatRelativeTime(doc.deletedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              docsApi.restore(doc._id).then(() => {
                                setTrashedDocs((prev) => prev.filter((d) => d._id !== doc._id));
                                fetchAll();
                              }).catch(() => {});
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Permanently delete this document? This cannot be undone.")) {
                                docsApi.permanentDelete(doc._id).then(() => {
                                  setTrashedDocs((prev) => prev.filter((d) => d._id !== doc._id));
                                }).catch(() => {});
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            Delete permanently
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-surface-highlight bg-white dark:bg-surface-dark p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
                      delete
                    </span>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">
                      Trash is empty.
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                      Deleted documents will appear here and can be restored.
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              {/* Home: My Documents + Recent */}
              <section className="mb-10">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    My Documents
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {sortedMyDocs.map((doc) => (
                    <DocumentCard
                      key={doc._id}
                      documentId={doc._id}
                      title={doc.title || "Untitled"}
                      updatedAt={doc.updatedAt}
                      onClick={openDoc}
                      isStarred={starredIds.has(doc._id)}
                      onStarToggle={(e) => handleStarToggle(e, doc._id)}
                    />
                  ))}
                  <NewDocumentCard onClick={() => setCreateOpen(true)} />
                </div>
              </section>
              <section>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Recent Documents
                  </h1>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {sortedRecentDocs.map((doc) => (
                    <DocumentCard
                      key={doc._id}
                      documentId={doc._id}
                      title={doc.title || "Untitled"}
                      updatedAt={doc.updatedAt}
                      onClick={openDoc}
                      isStarred={starredIds.has(doc._id)}
                      onStarToggle={(e) => handleStarToggle(e, doc._id)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
          </div>
        </div>
      </main>
    </div>
  );
};

function DocumentCard({
  documentId,
  title,
  updatedAt,
  onClick,
  isStarred = false,
  onStarToggle,
}: {
  documentId: string;
  title: string;
  updatedAt?: string;
  onClick: (id: string) => void;
  isStarred?: boolean;
  onStarToggle?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(documentId)}
      onKeyDown={(e) => e.key === "Enter" && onClick(documentId)}
      className="group flex flex-col gap-3 p-3 rounded-2xl bg-white dark:bg-surface-highlight border border-slate-200 dark:border-transparent hover:border-primary/50 transition-all hover:shadow-lg dark:hover:shadow-primary/10 cursor-pointer relative"
    >
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-surface-dark relative">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20">
          <span className="material-symbols-outlined text-4xl text-primary/40">article</span>
        </div>
        {onStarToggle && (
          <button
            type="button"
            onClick={onStarToggle}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
            aria-label={isStarred ? "Remove from starred" : "Add to starred"}
          >
            <span className={`material-symbols-outlined text-lg ${isStarred ? "filled text-amber-500" : "text-slate-400 group-hover:text-amber-500"}`}>
              star
            </span>
          </button>
        )}
      </div>
      <div className="px-1 pb-2">
        <h3 className="text-slate-900 dark:text-white text-base font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">
            Edited {formatRelativeTime(updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function NewDocumentCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 bg-transparent p-6 transition-colors hover:border-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-card-dark/50"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-primary group-hover:text-white dark:bg-hover-dark">
        <span className="material-symbols-outlined">add</span>
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-900 group-hover:text-primary dark:text-white">
          New Document
        </p>
        <p className="text-xs text-text-secondary">Start from scratch</p>
      </div>
    </button>
  );
}
