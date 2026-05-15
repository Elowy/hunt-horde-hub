import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  LayersControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";

export interface SelectorZone {
  id: string;
  name: string;
  polygon_geojson?: any | null;
  settlements?: { name: string } | null;
}

interface Props {
  zones: SelectorZone[];
  selectedZoneId: string | null;
  onZoneSelect: (zoneId: string) => void;
  height?: string;
}

const HUNGARY_CENTER: [number, number] = [47.1625, 19.5033];

function FitBounds({ zones }: { zones: SelectorZone[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [];
    zones.forEach((z) => {
      const coords = z.polygon_geojson?.coordinates?.[0];
      if (coords) coords.forEach(([lng, lat]: number[]) => pts.push([lat, lng]));
    });
    if (pts.length) {
      map.fitBounds(L.latLngBounds(pts), { padding: [25, 25] });
    }
  }, [zones, map]);
  return null;
}

export const SecurityZoneSelectorMap = ({
  zones,
  selectedZoneId,
  onZoneSelect,
  height = "400px",
}: Props) => {
  const zonesWithPoly = useMemo(
    () =>
      zones.filter(
        (z) => (z.polygon_geojson?.coordinates?.[0]?.length ?? 0) >= 4
      ),
    [zones]
  );

  if (zonesWithPoly.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-md border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground p-4 text-center"
      >
        Még nincsenek poligonok megrajzolva. Használd a listát!
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className="w-full rounded-md overflow-hidden border"
    >
      <MapContainer
        center={HUNGARY_CENTER}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Utca">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Műhold">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <FitBounds zones={zonesWithPoly} />
        {zonesWithPoly.map((zone) => {
          const isSelected = selectedZoneId === zone.id;
          return (
            <GeoJSON
              key={`${zone.id}-${isSelected}`}
              data={zone.polygon_geojson}
              style={{
                color: isSelected ? "#1a3a2a" : "#888",
                weight: isSelected ? 3 : 2,
                fillColor: isSelected ? "#97BC62" : "#cccccc",
                fillOpacity: isSelected ? 0.5 : 0.25,
              }}
              eventHandlers={{
                click: () => onZoneSelect(zone.id),
              }}
            >
              <Popup>
                <strong>{zone.name}</strong>
                {zone.settlements?.name && (
                  <div className="text-xs">{zone.settlements.name}</div>
                )}
              </Popup>
            </GeoJSON>
          );
        })}
      </MapContainer>
    </div>
  );
};
