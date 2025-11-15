import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface MapZone {
  id: string;
  name: string;
  description: string | null;
  geojson: any;
  user_id: string;
}

interface MapZonesListProps {
  zones: MapZone[];
  onDelete: (zoneId: string) => void;
}

export const MapZonesList = ({ zones, onDelete }: MapZonesListProps) => {
  return (
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
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(zone.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
