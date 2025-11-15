import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup } from "react-leaflet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Save, X } from "lucide-react";
import { useMapZones } from "@/hooks/useMapZones";
import { useMapPOIs } from "@/hooks/useMapPOIs";
import { MapZonesList } from "@/components/map/MapZonesList";
import { MapPOIsList } from "@/components/map/MapPOIsList";
import { ZoneDialog } from "@/components/map/ZoneDialog";
import { POIDialog } from "@/components/map/POIDialog";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const MapManager = () => {
  const mapRef = useRef<L.Map | null>(null);
  const { zones, saveZone, deleteZone } = useMapZones();
  const { pois, savePOI, deletePOI } = useMapPOIs();

  const [drawingMode, setDrawingMode] = useState(false);
  const [placingPOI, setPlacingPOI] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showPOIDialog, setShowPOIDialog] = useState(false);
  const [poiCoords, setPoiCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (drawingMode) {
        setCurrentPolygon((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      } else if (placingPOI) {
        setPoiCoords([e.latlng.lat, e.latlng.lng]);
        setShowPOIDialog(true);
        setPlacingPOI(false);
      }
    };

    mapRef.current.on("click", handleMapClick);

    return () => {
      mapRef.current?.off("click", handleMapClick);
    };
  }, [drawingMode, placingPOI]);

  const startDrawing = () => {
    setDrawingMode(true);
    setCurrentPolygon([]);
  };

  const finishDrawing = () => {
    if (currentPolygon.length >= 3) {
      setShowZoneDialog(true);
    }
  };

  const cancelDrawing = () => {
    setDrawingMode(false);
    setCurrentPolygon([]);
  };

  const handleSaveZone = async (name: string, description: string) => {
    const success = await saveZone(name, description, currentPolygon);
    if (success) {
      setCurrentPolygon([]);
      setDrawingMode(false);
      setShowZoneDialog(false);
    }
  };

  const handleCancelZone = () => {
    setShowZoneDialog(false);
    setDrawingMode(false);
    setCurrentPolygon([]);
  };

  const handleSavePOI = async (name: string, description: string) => {
    if (poiCoords) {
      const success = await savePOI(name, description, poiCoords);
      if (success) {
        setPoiCoords(null);
        setShowPOIDialog(false);
      }
    }
  };

  const handleCancelPOI = () => {
    setPoiCoords(null);
    setShowPOIDialog(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Térképes Kezelő</h1>
        <p className="text-muted-foreground mt-2">
          Körzetek és POI-k kezelése térképen
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Műveletek</h3>
            <div className="space-y-2">
              {!drawingMode && !placingPOI && (
                <>
                  <Button className="w-full" onClick={startDrawing}>
                    <Plus className="h-4 w-4 mr-2" />
                    Körzet rajzolása
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setPlacingPOI(true)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    POI hozzáadása
                  </Button>
                </>
              )}
              {drawingMode && (
                <>
                  <div className="text-sm text-muted-foreground mb-2">
                    Kattints a térképre pontok hozzáadásához (minimum 3)
                  </div>
                  <div className="text-sm font-medium mb-2">
                    Pontok: {currentPolygon.length}
                  </div>
                  <Button className="w-full" onClick={finishDrawing}>
                    <Save className="h-4 w-4 mr-2" />
                    Mentés
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={cancelDrawing}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Mégse
                  </Button>
                </>
              )}
              {placingPOI && (
                <div className="text-sm text-muted-foreground">
                  Kattints a térképre a POI helyének kijelöléséhez
                </div>
              )}
            </div>
          </Card>

          <MapZonesList zones={zones} onDelete={deleteZone} />
          <MapPOIsList pois={pois} onDelete={deletePOI} />
        </div>

        <div className="lg:col-span-3">
          <Card className="p-4 h-[600px]">
            <MapContainer
              center={[47.4979, 19.0402]}
              zoom={8}
              style={{ height: "100%", width: "100%" }}
              className="rounded-lg"
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {currentPolygon.length > 0 && (
                <Polygon positions={currentPolygon} color="blue" />
              )}

              {zones.map((zone) => {
                const coords = zone.geojson.geometry.coordinates[0].map(
                  (coord: [number, number]) => [coord[1], coord[0]]
                );
                return (
                  <Polygon key={zone.id} positions={coords} color="green">
                    <Popup>
                      <div>
                        <h4 className="font-bold">{zone.name}</h4>
                        {zone.description && (
                          <p className="text-sm">{zone.description}</p>
                        )}
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {pois.map((poi) => (
                <Marker key={poi.id} position={[poi.latitude, poi.longitude]}>
                  <Popup>
                    <div>
                      <h4 className="font-bold">{poi.name}</h4>
                      {poi.description && (
                        <p className="text-sm">{poi.description}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Card>
        </div>
      </div>

      <ZoneDialog
        open={showZoneDialog}
        onOpenChange={setShowZoneDialog}
        onSave={handleSaveZone}
        onCancel={handleCancelZone}
      />

      <POIDialog
        open={showPOIDialog}
        onOpenChange={setShowPOIDialog}
        coords={poiCoords}
        onSave={handleSavePOI}
        onCancel={handleCancelPOI}
      />
    </div>
  );
};

export default MapManager;
