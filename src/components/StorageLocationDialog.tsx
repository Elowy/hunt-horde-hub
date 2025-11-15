import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

interface StorageLocationDialogProps {
  onLocationAdded: () => void;
  currentLocationCount?: number;
}

export const StorageLocationDialog = ({ onLocationAdded, currentLocationCount = 0 }: StorageLocationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { tier, limits } = useSubscription();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    capacity: "",
    notes: "",
    isDefault: false,
  });

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

      // Ellenőrizzük a hűtési hely limitet ingyenes felhasználóknak
      if (limits.maxStorageLocations !== null && currentLocationCount >= limits.maxStorageLocations) {
        toast({
          title: "Limit elérve",
          description: `Az ${tier === "free" ? "ingyenes" : ""} verzióban maximum ${limits.maxStorageLocations} hűtési hely regisztrálható. Váltson Normal vagy Pro előfizetésre a korlátlan hozzáadáshoz!`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("storage_locations").insert({
        user_id: user.id,
        name: formData.name,
        address: formData.address,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        notes: formData.notes,
        is_default: formData.isDefault,
      });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Hűtési helyszín sikeresen hozzáadva!",
      });

      setFormData({ name: "", address: "", capacity: "", notes: "", isDefault: false });
      setOpen(false);
      onLocationAdded();
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
        <Button variant="hunting" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Új helyszín
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Új hűtési helyszín hozzáadása</DialogTitle>
          <DialogDescription>
            Adja meg az új hűtési helyszín adatait
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Név *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="pl. Fő hűtőház"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Cím</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="pl. Budapest, Vadász utca 1."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="capacity">Kapacitás (db)</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="pl. 50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Jegyzetek</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="További információk..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
            />
            <Label htmlFor="isDefault" className="text-sm font-normal cursor-pointer">
              Beállítás alapértelmezett helyszínként
            </Label>
          </div>

          <p className="text-sm text-muted-foreground">
            💡 Hűtési árakat a helyszín létrehozása után az Edit ikonnal tudja hozzáadni.
          </p>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button type="submit" variant="hunting" disabled={loading}>
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
