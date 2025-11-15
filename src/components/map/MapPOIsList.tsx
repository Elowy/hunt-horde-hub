import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface MapPOI {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  zone_id: string | null;
  user_id: string;
}

interface MapPOIsListProps {
  pois: MapPOI[];
  onDelete: (poiId: string) => void;
}

export const MapPOIsList = ({ pois, onDelete }: MapPOIsListProps) => {
  return (
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
              onClick={() => onDelete(poi.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
