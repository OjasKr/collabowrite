import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Img2 from "../assets/Create-New-Image.png";
import { docsApi } from "@/lib/api";

export function Dialogbox({ onCreated }: { onCreated?: () => void }) {
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
        navigate(`/documents/${id}`);
      }
    } catch {
      // error handled by interceptor or show toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-2 bg-card border-border h-[200px] w-[160px] rounded-md hover:border-primary">
      <Dialog>
        <DialogTrigger asChild>
          <img
            className="h-full w-full cursor-pointer object-cover rounded"
            src={Img2}
            alt="Create new document"
          />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create a new document</DialogTitle>
            <DialogDescription>
              Enter a name for your document. Click create when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
