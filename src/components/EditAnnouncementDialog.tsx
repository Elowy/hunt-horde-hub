import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  content: string;
  user_id: string;
  expires_at: string | null;
}

interface EditAnnouncementDialogProps {
  announcement: Announcement;
  onSuccess?: () => void;
}

const getExpiryType = (expiresAt: string | null): string => {
  if (!expiresAt) return "none";
  
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7) return "week";
  if (diffDays <= 31) return "month";
  return "none";
};

export const EditAnnouncementDialog = ({ announcement, onSuccess }: EditAnnouncementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(announcement.title);
  const [content, setContent] = useState(announcement.content);
  const [expiryType, setExpiryType] = useState(getExpiryType(announcement.expires_at));
  const [loading, setLoading] = useState(false);

  const calculateExpiryDate = (type: string): string | null => {
    if (type === "none") return null;
    
    const now = new Date();
    if (type === "week") {
      now.setDate(now.getDate() + 7);
    } else if (type === "month") {
      now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
    const { error } = await supabase
      .from("announcements")
      .update({
        title,
        content,
        expires_at: calculateExpiryDate(expiryType),
      })
      .eq("id", announcement.id);

      if (error) throw error;

      toast.success("Hír sikeresen frissítve");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Hiba történt a hír frissítésekor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcement.id);

      if (error) throw error;

      toast.success("Hír sikeresen törölve");
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Hiba történt a hír törlésekor");
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Hír szerkesztése</DialogTitle>
              <DialogDescription>
                Módosítsd a hír tartalmát.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Cím</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Hír címe"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-content">Tartalom</Label>
                <Textarea
                  id="edit-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hír tartalma"
                  rows={6}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-expiryType">Lejárati időtartam</Label>
                <Select value={expiryType} onValueChange={setExpiryType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz időtartamot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nincs lejárat</SelectItem>
                    <SelectItem value="week">1 hét</SelectItem>
                    <SelectItem value="month">1 hónap</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ha nincs lejárat van kiválasztva, a hír határozatlan ideig aktív marad
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Mentés..." : "Mentés"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
            <AlertDialogDescription>
              Ez a művelet nem vonható vissza. A hír véglegesen törlésre kerül.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Törlés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
