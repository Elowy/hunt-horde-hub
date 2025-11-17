import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CreateGlobalAnnouncementDialogProps {
  onSuccess?: () => void;
}

export function CreateGlobalAnnouncementDialog({ onSuccess }: CreateGlobalAnnouncementDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Hiba",
        description: "A cím és tartalom megadása kötelező!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("announcements")
        .insert({
          title: title.trim(),
          content: content.trim(),
          user_id: user.id,
          is_global: true,
          expires_at: expiresAt?.toISOString() || null,
        });

      if (error) throw error;

      toast({
        title: "Sikeres létrehozás",
        description: "A globális hír sikeresen létrehozva!",
      });

      setOpen(false);
      setTitle("");
      setContent("");
      setExpiresAt(undefined);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error creating global announcement:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Globális hír létrehozása
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Új globális hír</DialogTitle>
          <DialogDescription>
            Ez a hír minden vadásztársaságnál megjelenik, kiemelten.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Cím *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Hír címe"
                maxLength={100}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Tartalom *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Hír tartalma"
                rows={5}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expires">Lejárati dátum (opcionális)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, "yyyy. MM. dd.") : "Válassz dátumot"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Létrehozás..." : "Létrehozás"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
