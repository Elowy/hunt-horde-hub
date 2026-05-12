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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, Edit, Trash2, Map as MapIcon, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityZoneMap, AllZonesMap, type GeoPolygon } from "./SecurityZoneMap";

interface SecurityZone {
  id: string;
  name: string;
  description: string | null;
  polygon_geojson: GeoPolygon | null;
}

export const SecurityZonesDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState<SecurityZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingZone, setEditingZone] = useState<SecurityZone | null>(null);
  const [showMapView, setShowMapView] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    polygon: GeoPolygon | null;
  }>({
    name: "",
    description: "",
    polygon: null,
  });

  useEffect(() => {
    if (open) fetchZones();
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
      setZones((data as any) || []);
    } catch (error: any) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", polygon: null });
    setEditingZone(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Hiba", description: "A körzet neve kötelező!", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        name: formData.name,
        description: formData.description || null,
        polygon_geojson: formData.polygon as any,
      };

      if (editingZone) {
        const { error } = await supabase
          .from("security_zones")
          .update(payload)
          .eq("id", editingZone.id);
        if (error) throw error;
        toast({ title: "Siker!", description: "Körzet frissítve!" });
      } else {
        const { error } = await supabase
          .from("security_zones")
          .insert({ user_id: user.id, ...payload });
        if (error) throw error;
        toast({ title: "Siker!", description: "Körzet létrehozva!" });
      }

      resetForm();
      fetchZones();
    } catch (error: any) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (zone: SecurityZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || "",
      polygon: zone.polygon_geojson || null,
    });
  };

  const handleDelete = async (zoneId: string) => {
    if (!confirm("Biztosan törli ezt a körzetet?")) return;

    try {
      const { error } = await supabase.from("security_zones").delete().eq("id", zoneId);
      if (error) throw error;
      toast({ title: "Siker!", description: "Körzet törölve!" });
      fetchZones();
    } catch (error: any) {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Biztonsági körzetek kezelése</DialogTitle>
          <DialogDescription>
            Adja meg a vadászatra elérhető biztonsági körzeteket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form with Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingZone ? "Körzet szerkesztése" : "Új körzet hozzáadása"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="data" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="data">Adatok</TabsTrigger>
                  <TabsTrigger value="map">Térképen berajzolás</TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="space-y-4 mt-4">
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
                </TabsContent>

                <TabsContent value="map" className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Rajzold be a körzet határait. A jobb felső sarokban lévő polygon eszközzel
                    indíthatod a rajzolást. Egyszerre csak egy polygon menthető.
                  </p>
                  <SecurityZoneMap
                    value={formData.polygon}
                    onChange={(p) => setFormData((f) => ({ ...f, polygon: p }))}
                    height={420}
                  />
                  {formData.polygon && (
                    <p className="text-xs text-muted-foreground">
                      Polygon mentésre kész ({formData.polygon.coordinates[0].length} pont).
                    </p>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-4">
                {editingZone && (
                  <Button variant="outline" onClick={resetForm}>
                    Mégse
                  </Button>
                )}
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? "Mentés..." : editingZone ? "Frissítés" : "Hozzáadás"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* List / Map view toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Meglévő körzetek</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMapView((s) => !s)}
              >
                {showMapView ? (
                  <>
                    <List className="h-4 w-4 mr-2" />
                    Lista nézet
                  </>
                ) : (
                  <>
                    <MapIcon className="h-4 w-4 mr-2" />
                    Térkép nézet
                  </>
                )}
              </Button>
            </div>

            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Még nincs körzet hozzáadva.</p>
            ) : showMapView ? (
              <AllZonesMap zones={zones} height={500} />
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
                        {zone.polygon_geojson && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapIcon className="h-3 w-3" /> Térképen berajzolva
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(zone)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(zone.id)}>
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
