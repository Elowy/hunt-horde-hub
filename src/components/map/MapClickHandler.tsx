import { useEffect } from "react";
import L from "leaflet";

interface MapClickHandlerProps {
  mapRef: React.RefObject<L.Map | null>;
  drawingMode: boolean;
  placingPOI: boolean;
  onDrawPoint: (coords: [number, number]) => void;
  onPlacePOI: (coords: [number, number]) => void;
}

export const MapClickHandler = ({
  mapRef,
  drawingMode,
  placingPOI,
  onDrawPoint,
  onPlacePOI,
}: MapClickHandlerProps) => {
  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (drawingMode) {
        onDrawPoint([e.latlng.lat, e.latlng.lng]);
      } else if (placingPOI) {
        onPlacePOI([e.latlng.lat, e.latlng.lng]);
      }
    };

    mapRef.current.on("click", handleMapClick);

    return () => {
      mapRef.current?.off("click", handleMapClick);
    };
  }, [drawingMode, placingPOI, onDrawPoint, onPlacePOI, mapRef]);

  return null;
};
