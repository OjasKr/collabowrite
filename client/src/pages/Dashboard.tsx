import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { docsApi } from "../lib/api";
import { Topbar } from "../components/Topbar";
import { Dialogbox } from "../components/Dialogbox";

interface DocItem {
  _id: string;
  title: string;
  owner?: { name: string; email: string };
  version?: number;
  updatedAt?: string;
}

export const Dashboard = () => {
  const [myDocs, setMyDocs] = useState<DocItem[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocItem[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      docsApi.list().then((r) => r.data.documents || []),
      docsApi.listShared().then((r) => r.data.documents || []),
      docsApi.listRecent().then((r) => r.data.documents || []),
    ])
      .then(([my, shared, recent]) => {
        setMyDocs(my);
        setSharedDocs(shared);
        setRecentDocs(recent);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openDoc = (id: string) => {
    navigate(`/documents/${id}`);
  };

  return (
    <div className="LandingPage min-h-screen flex flex-col bg-background">
      <Topbar />
      <div className="Docs-container-1">
        <div className="title-1">Start a new document</div>
        <div>
          <Dialogbox onCreated={fetchAll} />
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {myDocs.length > 0 && (
            <div className="Docs-container-2">
              <div className="title-2">My documents</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {myDocs.map((doc) => (
                  <DocCard
                    key={doc._id}
                    documentId={doc._id}
                    docName={doc.title}
                    onClick={openDoc}
                  />
                ))}
              </div>
            </div>
          )}
          {sharedDocs.length > 0 && (
            <div className="Docs-container-2">
              <div className="title-2">Shared with me</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {sharedDocs.map((doc) => (
                  <DocCard
                    key={doc._id}
                    documentId={doc._id}
                    docName={doc.title}
                    onClick={openDoc}
                  />
                ))}
              </div>
            </div>
          )}
          {recentDocs.length > 0 && (
            <div className="Docs-container-2">
              <div className="title-2">Recently edited</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {recentDocs.map((doc) => (
                  <DocCard
                    key={doc._id}
                    documentId={doc._id}
                    docName={doc.title}
                    onClick={openDoc}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const DocCard = ({
  documentId,
  docName,
  onClick,
}: {
  documentId: string;
  docName: string;
  onClick: (id: string) => void;
}) => (
  <div
    className="docs cursor-pointer"
    onClick={() => onClick(documentId)}
    onKeyDown={(e) => e.key === "Enter" && onClick(documentId)}
    role="button"
    tabIndex={0}
  >
    <FileText className="h-[85%] w-[80%] p-4 mx-auto text-muted-foreground" aria-hidden />
    <div className="w-full border-t border-border pt-1 px-1 text-sm font-semibold truncate">
      {docName || "Untitled"}
    </div>
  </div>
);
