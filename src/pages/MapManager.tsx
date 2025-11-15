import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapZone {
  id: string;
  name: string;
  description: string | null;
  geojson: any;
  user_id: string;
}

interface MapPOI {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  zone_id: string | null;
  user_id: string;
}

const MapManager = () => {
  const { toast } = useToast();
  const [zones, setZones] = useState<MapZone[]>([]);
  const [pois, setPois] = useState<MapPOI[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showPOIDialog, setShowPOIDialog] = useState(false);
  const [poiName, setPoiName] = useState("");
  const [poiDescription, setPoiDescription] = useState("");
  const [poiCoords, setPoiCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    fetchZones();
    fetchPOIs();
  }, []);

  const fetchZones = async () => {
    const { data, error } = await supabase
      .from("map_zones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a körzeteket.",
        variant: "destructive",
      });
    } else {
      setZones(data || []);
    }
  };

  const fetchPOIs = async () => {
    const { data, error } = await supabase
      .from("map_pois")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a POI-kat.",
        variant: "destructive",
      });
    } else {
      setPois(data || []);
    }
  };

  const saveZone = async () => {
    if (!zoneName || currentPolygon.length < 3) {
      toast({
        title: "Hiba",
        description: "Add meg a körzet nevét és rajzolj legalább 3 pontot!",
        variant: "destructive",
      });
      return;
    }

    const geojson = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [currentPolygon.map(coord => [coord[1], coord[0]])],
      },
      properties: {
        name: zoneName,
        description: zoneDescription,
      },
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (selectedZone) {
      const { error } = await supabase
        .from("map_zones")
        .update({
          name: zoneName,
          description: zoneDescription,
          geojson,
        })
        .eq("id", selectedZone.id);

      if (error) {
        toast({
          title: "Hiba",
          description: "Nem sikerült frissíteni a körzetet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Siker",
          description: "Körzet sikeresen frissítve!",
        });
        fetchZones();
      }
    } else {
      const { error } = await supabase.from("map_zones").insert({
        name: zoneName,
        description: zoneDescription,
        geojson,
        user_id: user.id,
      });

      if (error) {
        toast({
          title: "Hiba",
          description: "Nem sikerült menteni a körzetet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Siker",
          description: "Körzet sikeresen mentve!",
        });
        fetchZones();
      }
    }

    setCurrentPolygon([]);
    setZoneName("");
    setZoneDescription("");
    setSelectedZone(null);
    setDrawingMode(false);
    setShowZoneDialog(false);
  };

  const deleteZone = async (zoneId: string) => {
    const { error } = await supabase
      .from("map_zones")
      .delete()
      .eq("id", zoneId);

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a körzetet.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Siker",
        description: "Körzet törölve!",
      });
      fetchZones();
    }
  };

  const savePOI = async () => {
    if (!poiName || !poiCoords) {
      toast({
        title: "Hiba",
        description: "Add meg a POI nevét és kattints a térképre!",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("map_pois").insert({
      name: poiName,
      description: poiDescription,
      latitude: poiCoords[0],
      longitude: poiCoords[1],
      user_id: user.id,
    });

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni a POI-t.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Siker",
        description: "POI sikeresen mentve!",
      });
      fetchPOIs();
      setPoiName("");
      setPoiDescription("");
      setPoiCoords(null);
      setShowPOIDialog(false);
    }
  };

  const deletePOI = async (poiId: string) => {
    const { error } = await supabase
      .from("map_pois")
      .delete()
      .eq("id", poiId);

    if (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a POI-t.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Siker",
        description: "POI törölve!",
      });
      fetchPOIs();
    }
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (drawingMode) {
          setCurrentPolygon([...currentPolygon, [e.latlng.lat, e.latlng.lng]]);
        } else if (showPOIDialog) {
          setPoiCoords([e.latlng.lat, e.latlng.lng]);
        }
      },
    });
    return null;
  };

  const startDrawing = () => {
    setDrawingMode(true);
    setCurrentPolygon([]);
    setShowZoneDialog(true);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Térképes Kezelő</h1>
        <p className="text-muted-foreground mt-2">Körzetek és POI-k kezelése térképen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Műveletek</h3>
            <div className="space-y-2">
              <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" onClick={startDrawing}>
                    <Plus className="h-4 w-4 mr-2" />
                    Körzet rajzolása
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Körzet mentése</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Körzet neve</Label>
                      <Input
                        value={zoneName}
                        onChange={(e) => setZoneName(e.target.value)}
                        placeholder="Körzet neve"
                      />
                    </div>
                    <div>
                      <Label>Leírás</Label>
                      <Textarea
                        value={zoneDescription}
                        onChange={(e) => setZoneDescription(e.target.value)}
                        placeholder="Leírás"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pontok: {currentPolygon.length}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveZone} className="flex-1">
                        Mentés
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentPolygon([]);
                          setDrawingMode(false);
                          setShowZoneDialog(false);
                        }}
                      >
                        Mégse
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showPOIDialog} onOpenChange={setShowPOIDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <MapPin className="h-4 w-4 mr-2" />
                    POI hozzáadása
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>POI hozzáadása</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>POI neve</Label>
                      <Input
                        value={poiName}
                        onChange={(e) => setPoiName(e.target.value)}
                        placeholder="POI neve"
                      />
                    </div>
                    <div>
                      <Label>Leírás</Label>
                      <Textarea
                        value={poiDescription}
                        onChange={(e) => setPoiDescription(e.target.value)}
                        placeholder="Leírás"
                      />
                    </div>
                    {poiCoords && (
                      <div className="text-sm text-muted-foreground">
                        Koordináták: {poiCoords[0].toFixed(6)}, {poiCoords[1].toFixed(6)}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={savePOI} className="flex-1">
                        Mentés
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPoiCoords(null);
                          setShowPOIDialog(false);
                        }}
                      >
                        Mégse
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">Körzetek</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between p-2 border rounded hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{zone.name}</p>
                    {zone.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {zone.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteZone(zone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">POI-k</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pois.map((poi) => (
                <div
                  key={poi.id}
                  className="flex items-center justify-between p-2 border rounded hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{poi.name}</p>
                    {poi.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {poi.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deletePOI(poi.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="p-4 h-[600px]">
            <MapContainer
              center={[47.4979, 19.0402]}
              zoom={8}
              style={{ height: "100%", width: "100%" }}
              className="rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler />
              
              {/* Draw current polygon */}
              {currentPolygon.length > 0 && (
                <Polygon positions={currentPolygon} color="blue" />
              )}

              {/* Display saved zones */}
              {zones.map((zone) => {
                const coords = zone.geojson.geometry.coordinates[0].map(
                  (coord: [number, number]) => [coord[1], coord[0]]
                );
                return (
                  <Polygon key={zone.id} positions={coords} color="green">
                    <Popup>
                      <div>
                        <h4 className="font-bold">{zone.name}</h4>
                        {zone.description && <p className="text-sm">{zone.description}</p>}
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* Display POIs */}
              {pois.map((poi) => (
                <Marker key={poi.id} position={[poi.latitude, poi.longitude]}>
                  <Popup>
                    <div>
                      <h4 className="font-bold">{poi.name}</h4>
                      {poi.description && <p className="text-sm">{poi.description}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MapManager;
