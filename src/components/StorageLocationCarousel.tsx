import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Trash2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { EditStorageLocationDialog } from "@/components/EditStorageLocationDialog";
import { StorageLocationQRDialog } from "@/components/StorageLocationQRDialog";

interface StorageLocation {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  is_default: boolean;
  notes: string | null;
  qr_code: string | null;
  qr_enabled: boolean;
}

interface LocationStats {
  monthlyCoolingValue: number;
  currentCount: number;
  monthlyShipped: number;
}

interface StorageLocationCarouselProps {
  locations: StorageLocation[];
  getLocationStats: (locationId: string) => LocationStats;
  onSetDefault: (locationId: string) => void;
  onDelete: (locationId: string) => void;
  onLocationUpdated: () => void;
}

export const StorageLocationCarousel = ({
  locations,
  getLocationStats,
  onSetDefault,
  onDelete,
  onLocationUpdated,
}: StorageLocationCarouselProps) => {
  const [emblaRef] = useEmblaCarousel({ 
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });
  const isMobile = useIsMobile();

  const renderLocationCard = (location: StorageLocation) => {
    const stats = getLocationStats(location.id);
    return (
      <Card 
        key={location.id} 
        className={`${location.is_default ? "border-accent border-2" : ""} ${
          isMobile ? "min-w-[280px] flex-shrink-0" : ""
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-5 w-5 text-accent flex-shrink-0" />
              <CardTitle className="text-lg truncate">{location.name}</CardTitle>
              {location.is_default && (
                <Badge variant="outline" className="text-accent border-accent flex-shrink-0">
                  Alapértelmezett
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              {!location.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetDefault(location.id)}
                  className="h-8 w-8 p-0"
                >
                  <Star className="h-4 w-4 text-muted-foreground hover:text-accent" />
                </Button>
              )}
              <StorageLocationQRDialog
                locationId={location.id}
                locationName={location.name}
                onUpdate={onLocationUpdated}
              />
              <EditStorageLocationDialog location={location} onLocationUpdated={onLocationUpdated} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(location.id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {location.address && (
            <p className="text-sm text-muted-foreground line-clamp-2">{location.address}</p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Teljes havi hűtési érték:</span>
            <span className="font-semibold">{stats.monthlyCoolingValue.toLocaleString("hu-HU")} Ft</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Jelenlegi bentlévő:</span>
            <span className="font-semibold">{stats.currentCount} db</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Havi elszállított:</span>
            <span className="font-semibold">{stats.monthlyShipped} db</span>
          </div>
          {location.capacity && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kapacitás:</span>
              <span className="font-semibold">{location.capacity} db</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isMobile) {
    return (
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 touch-pan-x">
          {locations.map((location) => renderLocationCard(location))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {locations.map((location) => renderLocationCard(location))}
    </div>
  );
};
