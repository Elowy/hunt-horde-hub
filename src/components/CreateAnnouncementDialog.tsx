import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateAnnouncementDialogProps {
  onSuccess?: () => void;
}

export const CreateAnnouncementDialog = ({ onSuccess }: CreateAnnouncementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nincs bejelentkezve");
        return;
      }

      const { error } = await supabase
        .from("announcements")
        .insert({
          user_id: user.id,
          title,
          content,
          expires_at: expiresAt || null,
        });

      if (error) throw error;

      toast.success("Hír sikeresen létrehozva");
      setTitle("");
      setContent("");
      setExpiresAt("");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Hiba történt a hír létrehozásakor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hunting" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Új hír
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Új hír létrehozása</DialogTitle>
            <DialogDescription>
              Hozz létre egy új hírt, amely minden felhasználó számára látható lesz.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Cím</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Hír címe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Tartalom</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Hír tartalma"
                rows={6}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiresAt">Lejárati időpont (opcionális)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              />
              <p className="text-xs text-muted-foreground">
                Ha nincs megadva, a hír határozatlan ideig aktív marad
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Létrehozás..." : "Létrehozás"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
