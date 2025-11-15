import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface POIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coords: [number, number] | null;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}

export const POIDialog = ({
  open,
  onOpenChange,
  coords,
  onSave,
  onCancel,
}: POIDialogProps) => {
  const [poiName, setPoiName] = useState("");
  const [poiDescription, setPoiDescription] = useState("");

  const handleSave = () => {
    onSave(poiName, poiDescription);
    setPoiName("");
    setPoiDescription("");
  };

  const handleCancel = () => {
    setPoiName("");
    setPoiDescription("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>POI hozzáadása</DialogTitle>
          <DialogDescription>
            Add meg a POI nevét és opcionálisan egy leírást.
          </DialogDescription>
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
          {coords && (
            <div className="text-sm text-muted-foreground">
              Koordináták: {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Mentés
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Mégse
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
