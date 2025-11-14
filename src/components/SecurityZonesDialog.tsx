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
import { MapPin, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SecurityZone {
  id: string;
  name: string;
  description: string | null;
}

export const SecurityZonesDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingZone, setEditingZone] = useState<SecurityZone | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (open) {
      fetchZones();
    }
  }, [open]);

  const fetchZones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("security_zones")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setZones(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Hiba",
        description: "A körzet neve kötelező!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingZone) {
        const { error } = await supabase
          .from("security_zones")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("id", editingZone.id);

        if (error) throw error;
        toast({ title: "Siker!", description: "Körzet frissítve!" });
      } else {
        const { error } = await supabase
          .from("security_zones")
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description || null,
          });

        if (error) throw error;
        toast({ title: "Siker!", description: "Körzet létrehozva!" });
      }

      setFormData({ name: "", description: "" });
      setEditingZone(null);
      fetchZones();
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

  const handleEdit = (zone: SecurityZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || "",
    });
  };

  const handleDelete = async (zoneId: string) => {
    if (!confirm("Biztosan törli ezt a körzetet?")) return;

    try {
      const { error } = await supabase
        .from("security_zones")
        .delete()
        .eq("id", zoneId);

      if (error) throw error;
      toast({ title: "Siker!", description: "Körzet törölve!" });
      fetchZones();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <MapPin className="h-4 w-4 mr-2" />
          Biztonsági körzetek
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Biztonsági körzetek kezelése</DialogTitle>
          <DialogDescription>
            Adja meg a vadászatra elérhető biztonsági körzeteket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Űrlap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingZone ? "Körzet szerkesztése" : "Új körzet hozzáadása"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Körzet neve *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="pl. Északi erdő"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Leírás</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Részletek, határok, különlegességek..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                {editingZone && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingZone(null);
                      setFormData({ name: "", description: "" });
                    }}
                  >
                    Mégse
                  </Button>
                )}
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? "Mentés..." : editingZone ? "Frissítés" : "Hozzáadás"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Meglévő körzetek</h3>
            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Még nincs körzet hozzáadva.</p>
            ) : (
              <div className="space-y-2">
                {zones.map((zone) => (
                  <Card key={zone.id}>
                    <CardContent className="p-4 flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{zone.name}</h4>
                        {zone.description && (
                          <p className="text-sm text-muted-foreground mt-1">{zone.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(zone)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(zone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
