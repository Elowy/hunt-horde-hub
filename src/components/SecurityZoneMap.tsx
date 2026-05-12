import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, Polygon, Popup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// Fix default marker icons for Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Hungarian translations for leaflet-draw
const Ldraw: any = (L as any).drawLocal;
if (Ldraw) {
  Ldraw.draw.toolbar.actions = { title: "Rajzolás megszakítása", text: "Mégse" };
  Ldraw.draw.toolbar.finish = { title: "Rajzolás befejezése", text: "Befejezés" };
  Ldraw.draw.toolbar.undo = { title: "Utolsó pont törlése", text: "Pont törlése" };
  Ldraw.draw.toolbar.buttons = {
    ...Ldraw.draw.toolbar.buttons,
    polygon: "Polygon rajzolása",
  };
  Ldraw.draw.handlers.polygon = {
    tooltip: {
      start: "Kattints a rajzolás indításához.",
      cont: "Kattints a következő pont hozzáadásához.",
      end: "Kattints az első pontra a befejezéshez.",
    },
  };
  Ldraw.edit.toolbar.actions = {
    save: { title: "Mentés", text: "Mentés" },
    cancel: { title: "Mégse", text: "Mégse" },
    clearAll: { title: "Összes törlése", text: "Összes törlése" },
  };
  Ldraw.edit.toolbar.buttons = {
    edit: "Szerkesztés",
    editDisabled: "Nincs szerkeszthető elem",
    remove: "Törlés",
    removeDisabled: "Nincs törölhető elem",
  };
  Ldraw.edit.handlers.edit = { tooltip: { text: "Húzd a csúcspontokat a szerkesztéshez.", subtext: "" } };
  Ldraw.edit.handlers.remove = { tooltip: { text: "Kattints a polygonra a törléshez." } };
}

export type GeoPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

interface SecurityZoneMapProps {
  value?: GeoPolygon | null;
  onChange?: (polygon: GeoPolygon | null) => void;
  readOnly?: boolean;
  height?: number;
}

const HUNGARY_CENTER: [number, number] = [47.1625, 19.5033];
const DEFAULT_ZOOM = 7;

function FitBounds({ polygon }: { polygon?: GeoPolygon | null }) {
  const map = useMap();
  useEffect(() => {
    if (polygon && polygon.coordinates?.[0]?.length) {
      const latlngs = polygon.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [polygon, map]);
  return null;
}

export const SecurityZoneMap = ({
  value,
  onChange,
  readOnly = false,
  height = 400,
}: SecurityZoneMapProps) => {
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  // Load existing polygon into the FeatureGroup
  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    fg.clearLayers();
    if (value && value.coordinates?.[0]?.length) {
      const latlngs = value.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
      const layer = L.polygon(latlngs);
      fg.addLayer(layer);
    }
  }, [value]);

  const layerToGeoJSON = (layer: L.Layer): GeoPolygon | null => {
    const gj = (layer as any).toGeoJSON();
    if (gj?.geometry?.type === "Polygon") return gj.geometry as GeoPolygon;
    return null;
  };

  const handleCreated = (e: any) => {
    const fg = featureGroupRef.current;
    if (fg) {
      // Keep only the newest polygon
      fg.eachLayer((l) => {
        if (l !== e.layer) fg.removeLayer(l);
      });
    }
    const poly = layerToGeoJSON(e.layer);
    onChange?.(poly);
  };

  const handleEdited = (e: any) => {
    let poly: GeoPolygon | null = null;
    e.layers.eachLayer((l: L.Layer) => {
      poly = layerToGeoJSON(l);
    });
    if (poly) onChange?.(poly);
  };

  const handleDeleted = () => {
    onChange?.(null);
  };

  return (
    <div style={{ height }} className="w-full rounded-md overflow-hidden border">
      <MapContainer
        center={HUNGARY_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds polygon={value} />
        <FeatureGroup ref={featureGroupRef as any}>
          {!readOnly && (
            <EditControl
              position="topright"
              onCreated={handleCreated}
              onEdited={handleEdited}
              onDeleted={handleDeleted}
              draw={{
                polygon: {
                  allowIntersection: false,
                  showArea: true,
                  shapeOptions: { color: "hsl(var(--primary))" },
                },
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
              }}
            />
          )}
        </FeatureGroup>
      </MapContainer>
    </div>
  );
};

interface ZoneWithPolygon {
  id: string;
  name: string;
  description?: string | null;
  polygon_geojson?: GeoPolygon | null;
}

interface AllZonesMapProps {
  zones: ZoneWithPolygon[];
  height?: number;
}

// Simple stable color from id
const colorFromId = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
};

function FitAllBounds({ zones }: { zones: ZoneWithPolygon[] }) {
  const map = useMap();
  useEffect(() => {
    const all: [number, number][] = [];
    zones.forEach((z) => {
      if (z.polygon_geojson?.coordinates?.[0]) {
        z.polygon_geojson.coordinates[0].forEach(([lng, lat]) => all.push([lat, lng]));
      }
    });
    if (all.length) {
      map.fitBounds(L.latLngBounds(all), { padding: [30, 30] });
    }
  }, [zones, map]);
  return null;
}

export const AllZonesMap = ({ zones, height = 500 }: AllZonesMapProps) => {
  const zonesWithPoly = zones.filter((z) => z.polygon_geojson?.coordinates?.[0]?.length);
  return (
    <div style={{ height }} className="w-full rounded-md overflow-hidden border">
      <MapContainer
        center={HUNGARY_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitAllBounds zones={zonesWithPoly} />
        {zonesWithPoly.map((z) => {
          const positions = z.polygon_geojson!.coordinates[0].map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );
          const color = colorFromId(z.id);
          return (
            <Polygon key={z.id} positions={positions} pathOptions={{ color, fillColor: color, fillOpacity: 0.25 }}>
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{z.name}</div>
                  {z.description && <div className="text-sm">{z.description}</div>}
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
};
