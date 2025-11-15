import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateTicketDialogProps {
  onTicketCreated: () => void;
  isHunter?: boolean;
  isAdmin?: boolean;
  isEditor?: boolean;
}

export const CreateTicketDialog = ({ onTicketCreated, isHunter, isAdmin, isEditor }: CreateTicketDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    category: "",
    subject: "",
    message: "",
  });

  const getAvailableCategories = () => {
    if (isHunter) {
      return [
        { value: "hunting_registration", label: "Vadászati beiratkozás hiba" }
      ];
    }

    if (isAdmin || isEditor) {
      return [
        { value: "cooling_location", label: "Hűtési helyszínek hiba" },
        { value: "statistics", label: "Statisztika hiba" },
        { value: "animal_records", label: "Állat nyilvántartás hiba" },
        { value: "user_issues", label: "Felhasználói hibák" },
        { value: "animal_add", label: "Vad felvétel hiba" },
        { value: "transport", label: "Elszállítási hiba" },
        { value: "hunting_registration", label: "Vadászati beiratkozás hiba" },
        { value: "hired_hunters", label: "Bérvadászok hiba" },
        { value: "zone_closures", label: "Körzetek lezárása hiba" },
        { value: "qr_code", label: "QR kód hiba" },
        { value: "subscription", label: "Előfizetés hiba" },
      ];
    }

    return [];
  };

  const categories = getAvailableCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Hiba",
          description: "Nincs bejelentkezve!",
          variant: "destructive",
        });
        return;
      }

      if (formData.message.length > 500) {
        toast({
          title: "Hiba",
          description: "Az üzenet maximum 500 karakter lehet!",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("tickets").insert({
        user_id: user.id,
        category: formData.category,
        subject: formData.subject,
        message: formData.message,
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Sikeres létrehozás!",
        description: "Támogatási jegy sikeresen létrehozva!",
      });

      setFormData({ category: "", subject: "", message: "" });
      setOpen(false);
      onTicketCreated();
    } catch (error: any) {
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
        <Button variant="hunting">
          <Plus className="h-4 w-4 mr-2" />
          Új támogatási jegy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Új támogatási jegy létrehozása</DialogTitle>
          <DialogDescription>
            Írja le a problémát vagy kérését részletesen
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Kategória *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Válasszon kategóriát" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Tárgy *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Rövid leírás a problémáról"
              required
              maxLength={100}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Üzenet *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Részletes leírás a problémáról..."
              required
              maxLength={500}
              rows={6}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.message.length} / 500 karakter
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Létrehozás..." : "Jegy létrehozása"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
