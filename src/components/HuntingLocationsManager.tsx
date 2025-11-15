import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HuntingLocation {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  security_zone_id: string;
  display_order: number;
}

interface HuntingLocationsManagerProps {
  securityZoneId: string;
  securityZoneName: string;
}

const locationTypeLabels: Record<string, string> = {
  fedett_les: "Fedett les",
  nem_fedett_les: "Nem fedett les",
  magan_szoro: "Magán szóró",
  kozponti_szoro: "Központi szóró",
  csapda: "Csapda",
};

export function HuntingLocationsManager({ securityZoneId, securityZoneName }: HuntingLocationsManagerProps) {
  const [locations, setLocations] = useState<HuntingLocation[]>([]);
  const [editingLocation, setEditingLocation] = useState<HuntingLocation | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "fedett_les",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    fetchLocations();
  }, [securityZoneId]);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("hunting_locations")
      .select("*")
      .eq("security_zone_id", securityZoneId)
      .order("display_order");

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült betölteni a helyszíneket", variant: "destructive" });
    } else {
      setLocations(data || []);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "fedett_les", latitude: "", longitude: "" });
    setEditingLocation(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: "Hiba", description: "A helyszín neve kötelező!", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const locationData = {
      name: formData.name,
      type: formData.type as "fedett_les" | "nem_fedett_les" | "magan_szoro" | "kozponti_szoro" | "csapda",
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      security_zone_id: securityZoneId,
      user_id: user.id,
    };

    if (editingLocation) {
      const { error } = await supabase
        .from("hunting_locations")
        .update(locationData)
        .eq("id", editingLocation.id);

      if (error) {
        toast({ title: "Hiba", description: "Nem sikerült módosítani", variant: "destructive" });
      } else {
        toast({ title: "Helyszín módosítva" });
        resetForm();
        fetchLocations();
      }
    } else {
      const insertData = {
        ...locationData,
        display_order: locations.length,
      };
      
      const { error } = await supabase
        .from("hunting_locations")
        .insert([insertData]);

      if (error) {
        toast({ title: "Hiba", description: "Nem sikerült hozzáadni", variant: "destructive" });
      } else {
        toast({ title: "Helyszín hozzáadva" });
        resetForm();
        fetchLocations();
      }
    }
  };

  const handleEdit = (location: HuntingLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      type: location.type,
      latitude: location.latitude?.toString() || "",
      longitude: location.longitude?.toString() || "",
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan törli ezt a helyszínt?")) return;

    const { error } = await supabase.from("hunting_locations").delete().eq("id", id);

    if (error) {
      toast({ title: "Hiba", description: "Nem sikerült törölni", variant: "destructive" });
    } else {
      toast({ title: "Helyszín törölve" });
      fetchLocations();
    }
  };

  const moveLocation = async (id: string, direction: "up" | "down") => {
    const index = locations.findIndex((l) => l.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === locations.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...locations];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    const updated = reordered.map((l, i) => ({ ...l, display_order: i }));
    setLocations(updated);

    for (const location of updated) {
      await supabase
        .from("hunting_locations")
        .update({ display_order: location.display_order })
        .eq("id", location.id);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Pontos helyszínek - {securityZoneName}
        </h4>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Új helyszín
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingLocation ? "Helyszín szerkesztése" : "Új helyszín"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Név *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="pl. Öreg tölgyes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Típus *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(locationTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Szélesség (GPS)</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="pl. 47.497912"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Hosszúság (GPS)</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="pl. 19.040235"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Mégse
                </Button>
                <Button type="submit">
                  {editingLocation ? "Módosítás" : "Hozzáadás"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {locations.length === 0 && !showAddForm ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Még nincs helyszín hozzáadva
        </p>
      ) : (
        <div className="space-y-2">
          {locations.map((location, index) => (
            <Card key={location.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {locationTypeLabels[location.type]}
                    {location.latitude && location.longitude && (
                      <> • GPS: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveLocation(location.id, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveLocation(location.id, "down")}
                    disabled={index === locations.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(location)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
