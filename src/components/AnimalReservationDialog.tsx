import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Check } from "lucide-react";

interface AnimalReservationDialogProps {
  animalId: string;
  animalIdentifier: string;
  currentStatus: string;
  reservedBy?: string | null;
  reservationNote?: string | null;
  isHunter: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  onReservationUpdated: () => void;
}

export const AnimalReservationDialog = ({
  animalId,
  animalIdentifier,
  currentStatus,
  reservedBy,
  reservationNote,
  isHunter,
  isAdmin,
  isEditor,
  onReservationUpdated,
}: AnimalReservationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState(reservationNote || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReservation = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let updateData: any = {
        reservation_note: note || null,
      };

      // Ha vadász és pending-re állítja
      if (isHunter && status === "pending") {
        updateData.reservation_status = "pending";
        updateData.reserved_by = user.id;
        updateData.reserved_at = new Date().toISOString();
      } 
      // Ha admin/editor és módosítja a státuszt
      else if ((isAdmin || isEditor) && status) {
        updateData.reservation_status = status;
        
        // Ha elérhetőre állítja, töröljük a foglalást
        if (status === "available") {
          updateData.reserved_by = null;
          updateData.reserved_at = null;
        }
        // Ha jóváhagyva-ra állítja és még nincs foglalva
        else if (status === "approved" && !reservedBy) {
          updateData.reserved_by = user.id;
          updateData.reserved_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("animals")
        .update(updateData)
        .eq("id", animalId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Foglalás frissítve!",
      });

      setOpen(false);
      onReservationUpdated();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Elérhető";
      case "pending":
        return "Foglalva, jóváhagyás szükséges";
      case "approved":
        return "Foglalva, jóváhagyva";
      case "atev":
        return "Kobzott, gázolt (ATEV)";
      default:
        return "Elérhető";
    }
  };

  const needsApproval = currentStatus === "pending" && (isAdmin || isEditor);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isHunter ? (
          <Button variant="ghost" size="sm" title="Igényt tartok rá">
            <Check className="h-4 w-4" />
          </Button>
        ) : needsApproval ? (
          <Button variant="ghost" size="sm" className="text-yellow-600" title="Jóváhagyás szükséges">
            <AlertCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" title="Foglalás szerkesztése">
            <AlertCircle className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vad foglalása - {animalIdentifier}</DialogTitle>
          <DialogDescription>
            {isHunter
              ? "Jelölje meg, hogy igényt tart erre a vadra."
              : "Kezelje a vad foglalási státuszát."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Státusz</Label>
            {isHunter ? (
              <Select value="pending" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Foglalva, jóváhagyás szükséges</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Elérhető, Szabad</SelectItem>
                  <SelectItem value="pending">Foglalva, jóváhagyás szükséges</SelectItem>
                  <SelectItem value="approved">Foglalva, jóváhagyva</SelectItem>
                  <SelectItem value="atev">Kobzott, gázolt (ATEV)</SelectItem>
                </SelectContent>
              </Select>
            )}
            <p className="text-sm text-muted-foreground">
              Jelenlegi státusz: {getStatusLabel(currentStatus)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Megjegyzés</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcionális megjegyzés a foglaláshoz..."
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Mégse
          </Button>
          <Button onClick={handleReservation} disabled={loading}>
            {loading ? "Mentés..." : isHunter ? "Igényt tartok rá" : "Mentés"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
