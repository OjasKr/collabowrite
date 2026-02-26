import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { docsApi } from "@/lib/api";

interface CreateDocumentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateDocumentDialog({
  open: controlledOpen,
  onOpenChange,
  onCreated,
  trigger,
}: CreateDocumentDialogProps) {
  const navigate = useNavigate();
  const [docName, setDocName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await docsApi.create(docName.trim() || "Untitled");
      const id = data.document?._id;
      if (id) {
        onCreated?.();
        onOpenChange?.(false);
        setDocName("");
        navigate(`/documents/${id}`);
      }
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      <DialogHeader>
        <DialogTitle>Create a new document</DialogTitle>
        <DialogDescription>
          Enter a name for your document. Click create when you&apos;re done.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="create-doc-name" className="text-right">
            Name
          </Label>
          <Input
            id="create-doc-name"
            className="col-span-3"
            placeholder="Untitled"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating..." : "Create"}
        </Button>
      </DialogFooter>
    </>
  );

  if (controlledOpen !== undefined && onOpenChange) {
    return (
      <Dialog open={controlledOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">{content}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">{content}</DialogContent>
    </Dialog>
  );
}
