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

interface ZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}

export const ZoneDialog = ({
  open,
  onOpenChange,
  onSave,
  onCancel,
}: ZoneDialogProps) => {
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");

  const handleSave = () => {
    onSave(zoneName, zoneDescription);
    setZoneName("");
    setZoneDescription("");
  };

  const handleCancel = () => {
    setZoneName("");
    setZoneDescription("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Körzet mentése</DialogTitle>
          <DialogDescription>
            Add meg a körzet nevét és opcionálisan egy leírást.
          </DialogDescription>
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
