import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StorageLocation {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  notes: string | null;
  is_default: boolean;
}

interface EditStorageLocationDialogProps {
  location: StorageLocation;
  onLocationUpdated: () => void;
}

export const EditStorageLocationDialog = ({ location, onLocationUpdated }: EditStorageLocationDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: location.name,
    address: location.address || "",
    capacity: location.capacity?.toString() || "",
    notes: location.notes || "",
  });

  useEffect(() => {
    setFormData({
      name: location.name,
      address: location.address || "",
      capacity: location.capacity?.toString() || "",
      notes: location.notes || "",
    });
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Hiba",
        description: "A helyszín neve kötelező!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("storage_locations")
        .update({
          name: formData.name,
          address: formData.address || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          notes: formData.notes || null,
        })
        .eq("id", location.id);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Helyszín módosítva!",
      });

      setOpen(false);
      onLocationUpdated();
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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Helyszín szerkesztése</DialogTitle>
          <DialogDescription>
            Módosítsa a hűtési helyszín adatait
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Helyszín neve *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Fő hűtőház"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Cím</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Budapest, Vadász utca 1."
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Kapacitás (db)</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="100"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Jegyzetek</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="További információk..."
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
