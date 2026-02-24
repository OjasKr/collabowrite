import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { docsApi } from "../lib/api";

interface Collaborator {
  user: { _id: string; name: string; email: string };
  role: string;
}

interface Version {
  _id: string;
  version: number;
  savedBy: { name: string; email: string };
  createdAt: string;
}

export const DocumentSettings = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"viewer" | "editor">("editor");
  const [shareError, setShareError] = useState("");
  const [owner, setOwner] = useState<{ name: string; email: string } | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    Promise.all([
      docsApi.getCollaborators(documentId).then((r) => r.data),
      docsApi.getVersions(documentId).then((r) => r.data),
    ])
      .then(([collabRes, verRes]) => {
        setOwner(collabRes.owner as { name: string; email: string });
        setCollaborators(collabRes.collaborators || []);
        setVersions(verRes.versions || []);
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [documentId, navigate]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !shareEmail.trim()) return;
    setShareError("");
    setShareLoading(true);
    try {
      await docsApi.share(documentId, shareEmail.trim(), shareRole);
      const { data } = await docsApi.getCollaborators(documentId);
      setCollaborators(data.collaborators || []);
      setShareEmail("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setShareError(msg || "Failed to share.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    if (!documentId) return;
    try {
      await docsApi.unshare(documentId, userId);
      const { data } = await docsApi.getCollaborators(documentId);
      setCollaborators(data.collaborators || []);
    } catch {
      // ignore
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!documentId) return;
    try {
      await docsApi.restoreVersion(documentId, versionId);
      navigate(`/documents/${documentId}`);
    } catch {
      // ignore
    }
  };

  const handleCopy = async () => {
    if (!documentId) return;
    try {
      const { data } = await docsApi.copy(documentId);
      if (data.document?._id) {
        navigate(`/documents/${data.document._id}`);
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (soft: boolean) => {
    if (!documentId) return;
    if (!soft && !window.confirm("Permanently delete this document?")) return;
    try {
      await docsApi.delete(documentId, soft);
      navigate("/");
    } catch {
      // ignore
    }
  };

  if (!documentId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/documents/${documentId}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold">Document settings</h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Share</h2>
          <form onSubmit={handleShare} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label htmlFor="share-email">Email</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="collaborator@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            <div className="w-28 space-y-1">
              <Label htmlFor="share-role">Role</Label>
              <select
                id="share-role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as "viewer" | "editor")}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <Button type="submit" disabled={shareLoading}>
              {shareLoading ? "Sharing..." : "Share"}
            </Button>
          </form>
          {shareError && (
            <p className="text-sm text-destructive">{shareError}</p>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">People with access</h2>
          <ul className="border border-border rounded-md divide-y divide-border">
            {owner && (
              <li className="flex items-center justify-between px-4 py-2">
                <span>
                  {owner.name} ({owner.email}) — Owner
                </span>
              </li>
            )}
            {collaborators.map((c) => (
              <li
                key={c.user._id}
                className="flex items-center justify-between px-4 py-2"
              >
                <span>
                  {c.user.name} ({c.user.email}) — {c.role}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnshare(c.user._id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Version history</h2>
          <ul className="border border-border rounded-md divide-y divide-border">
            {versions.map((v) => (
              <li
                key={v._id}
                className="flex items-center justify-between px-4 py-2"
              >
                <span className="text-sm">
                  Version {v.version} — {v.savedBy?.name ?? "Unknown"} —{" "}
                  {new Date(v.createdAt).toLocaleString()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(v._id)}
                >
                  Restore
                </Button>
              </li>
            ))}
            {versions.length === 0 && (
              <li className="px-4 py-2 text-sm text-muted-foreground">
                No version history yet.
              </li>
            )}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Actions</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy}>
              Copy document
            </Button>
            <Button variant="outline" onClick={() => handleDelete(true)}>
              Move to trash
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(false)}>
              Delete permanently
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
