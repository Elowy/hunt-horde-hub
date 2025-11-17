import { useState, useEffect } from "react";
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
import { AlertCircle, Check, User, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  animalPrice?: number;
  coolingPrice?: number;
  animalWeight?: number;
}

interface UserProfile {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
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
  animalPrice = 0,
  coolingPrice = 0,
  animalWeight = 0,
}: AnimalReservationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState(reservationNote || "");
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reservedUserProfile, setReservedUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (isAdmin || isEditor) {
        fetchUsers();
      }
      if (reservedBy) {
        fetchReservedUserProfile(reservedBy);
      }
    }
  }, [open, reservedBy, isAdmin, isEditor]);

  const fetchUsers = async () => {
    try {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "hunter");

      if (!rolesData) return;

      const userIds = rolesData.map(r => r.user_id);
      
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, contact_name, contact_email, contact_phone, address")
        .in("id", userIds);

      if (profilesData) {
        setUsers(profilesData);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchReservedUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, contact_name, contact_email, contact_phone, address")
        .eq("id", userId)
        .single();

      if (data) {
        setReservedUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching reserved user profile:", error);
    }
  };

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
        // Ha jóváhagyva-ra állítja vagy kiválasztott egy felhasználót
        else if (status === "approved" || status === "pending") {
          // Ha van kiválasztott felhasználó, azt használjuk
          if (selectedUserId) {
            updateData.reserved_by = selectedUserId;
            if (!reservedBy) {
              updateData.reserved_at = new Date().toISOString();
            }
          } else if (!reservedBy) {
            // Ha nincs még foglalva, akkor a jelenlegi usert állítjuk be
            updateData.reserved_by = user.id;
            updateData.reserved_at = new Date().toISOString();
          }
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
          {/* Foglalt vadász adatai */}
          {reservedUserProfile && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Foglalta:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>{reservedUserProfile.contact_name || "Név nem megadva"}</span>
                </div>
                {reservedUserProfile.contact_email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span>{reservedUserProfile.contact_email}</span>
                  </div>
                )}
                {reservedUserProfile.contact_phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span>{reservedUserProfile.contact_phone}</span>
                  </div>
                )}
                {reservedUserProfile.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span>{reservedUserProfile.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Állat ára és hűtési díj */}
          {(animalPrice > 0 || coolingPrice > 0) && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm">Költségek:</h4>
              <div className="space-y-1 text-sm">
                {animalPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Állat ára ({animalWeight} kg):</span>
                    <span className="font-semibold">{animalPrice.toLocaleString("hu-HU")} Ft</span>
                  </div>
                )}
                {coolingPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hűtési díj:</span>
                    <span className="font-semibold">{coolingPrice.toLocaleString("hu-HU")} Ft</span>
                  </div>
                )}
                {(animalPrice > 0 || coolingPrice > 0) && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Összesen:</span>
                      <span className="text-green-600 dark:text-green-400">
                        {(animalPrice + coolingPrice).toLocaleString("hu-HU")} Ft
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Felhasználó kiválasztása admin/editor esetén */}
          {(isAdmin || isEditor) && (
            <div className="space-y-2">
              <Label>Vadász kiválasztása</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon vadászt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">- Nincs kiválasztva -</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.contact_name || user.contact_email || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUserId && (
                <p className="text-xs text-muted-foreground">
                  A kiválasztott vadász fogja megkapni a foglalást
                </p>
              )}
            </div>
          )}

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
