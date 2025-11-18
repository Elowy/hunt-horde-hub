import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface PendingAnimal {
  id: string;
  species: string;
  gender: string | null;
  hunter_name: string;
  notes: string | null;
  submitted_at: string;
  storage_location_id: string;
  hunter_society_id: string;
}

interface ApprovePendingAnimalDialogProps {
  animal: PendingAnimal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const ApprovePendingAnimalDialog = ({
  animal,
  open,
  onOpenChange,
  onUpdate,
}: ApprovePendingAnimalDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [securityZones, setSecurityZones] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    animal_id: "",
    weight: "",
    class: "",
    age: "",
    condition: "",
    cooling_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    security_zone_id: "",
    rejection_reason: "",
  });

  useEffect(() => {
    if (open && animal) {
      fetchSecurityZones();
      // Generate default animal_id
      const defaultId = `${animal.species.substring(0, 3).toUpperCase()}-${Date.now()}`;
      setFormData(prev => ({ ...prev, animal_id: defaultId }));
    }
  }, [open, animal]);

  const fetchSecurityZones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("security_zones")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setSecurityZones(data || []);
    } catch (error: any) {
      console.error("Error fetching security zones:", error);
    }
  };

  const handleApprove = async () => {
    if (!animal) return;

    if (!formData.animal_id || !formData.weight || !formData.class) {
      toast({
        title: "Hiányzó adatok",
        description: "Kérem töltse ki a kötelező mezőket!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      // Create approved animal
      const { error: animalError } = await supabase.from("animals").insert({
        user_id: animal.hunter_society_id,
        storage_location_id: animal.storage_location_id,
        animal_id: formData.animal_id,
        species: animal.species,
        gender: animal.gender,
        weight: parseFloat(formData.weight),
        class: formData.class,
        age: formData.age || null,
        condition: formData.condition || null,
        hunter_name: animal.hunter_name,
        notes: animal.notes,
        cooling_date: new Date(formData.cooling_date).toISOString(),
        security_zone_id: formData.security_zone_id || null,
      });

      if (animalError) throw animalError;

      // Update pending animal status
      const { error: updateError } = await supabase
        .from("pending_animals")
        .update({
          approval_status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          animal_id: formData.animal_id,
          weight: parseFloat(formData.weight),
          class: formData.class,
          age: formData.age || null,
          condition: formData.condition || null,
          cooling_date: new Date(formData.cooling_date).toISOString(),
          security_zone_id: formData.security_zone_id || null,
        })
        .eq("id", animal.id);

      if (updateError) throw updateError;

      toast({
        title: "Jóváhagyva!",
        description: "Az állat sikeresen jóváhagyásra került és hozzáadódott a nyilvántartáshoz.",
      });

      onOpenChange(false);
      onUpdate();
      resetForm();
    } catch (error: any) {
      console.error("Error approving animal:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!animal) return;

    if (!formData.rejection_reason) {
      toast({
        title: "Hiányzó indoklás",
        description: "Kérem adja meg az elutasítás indokát!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("pending_animals")
        .update({
          approval_status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: formData.rejection_reason,
        })
        .eq("id", animal.id);

      if (error) throw error;

      toast({
        title: "Elutasítva",
        description: "Az állatot elutasította.",
      });

      onOpenChange(false);
      onUpdate();
      resetForm();
    } catch (error: any) {
      console.error("Error rejecting animal:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const resetForm = () => {
    setFormData({
      animal_id: "",
      weight: "",
      class: "",
      age: "",
      condition: "",
      cooling_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      security_zone_id: "",
      rejection_reason: "",
    });
    setAction(null);
  };

  if (!animal) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Függőben lévő állat jóváhagyása</DialogTitle>
          <DialogDescription>
            Beküldve: {format(new Date(animal.submitted_at), "yyyy. MMM dd. HH:mm", { locale: hu })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Submitted Info */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold mb-2">Beküldött adatok</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Vadfaj:</span>
                <p className="font-medium">{animal.species}</p>
              </div>
              {animal.gender && (
                <div>
                  <span className="text-muted-foreground">Nem:</span>
                  <p className="font-medium">{animal.gender}</p>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-muted-foreground">Vadász neve:</span>
                <p className="font-medium">{animal.hunter_name}</p>
              </div>
              {animal.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Megjegyzések:</span>
                  <p className="font-medium">{animal.notes}</p>
                </div>
              )}
            </div>
          </div>

          {!action ? (
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => setAction("approve")}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Jóváhagyás
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setAction("reject")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Elutasítás
              </Button>
            </div>
          ) : action === "approve" ? (
            <form onSubmit={(e) => { e.preventDefault(); handleApprove(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="animal_id">Állat azonosító *</Label>
                <Input
                  id="animal_id"
                  value={formData.animal_id}
                  onChange={(e) => setFormData({ ...formData, animal_id: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Súly (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Osztály *</Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) => setFormData({ ...formData, class: value })}
                    required
                  >
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Válasszon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I.">I. osztály</SelectItem>
                      <SelectItem value="II.">II. osztály</SelectItem>
                      <SelectItem value="III.">III. osztály</SelectItem>
                      <SelectItem value="Selejt">Selejt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Életkor</Label>
                  <Input
                    id="age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="pl. 2 éves"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Kondíció</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => setFormData({ ...formData, condition: value })}
                  >
                    <SelectTrigger id="condition">
                      <SelectValue placeholder="Válasszon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jó">Jó</SelectItem>
                      <SelectItem value="Közepes">Közepes</SelectItem>
                      <SelectItem value="Gyenge">Gyenge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooling_date">Hűtési dátum</Label>
                <Input
                  id="cooling_date"
                  type="datetime-local"
                  value={formData.cooling_date}
                  onChange={(e) => setFormData({ ...formData, cooling_date: e.target.value })}
                />
              </div>

              {securityZones.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="security_zone">Vadásztér</Label>
                  <Select
                    value={formData.security_zone_id}
                    onValueChange={(value) => setFormData({ ...formData, security_zone_id: value })}
                  >
                    <SelectTrigger id="security_zone">
                      <SelectValue placeholder="Válasszon vadászteret" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setAction(null)} className="flex-1">
                  Vissza
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Mentés..." : "Jóváhagyás"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejection_reason">Elutasítás indoka *</Label>
                <Textarea
                  id="rejection_reason"
                  value={formData.rejection_reason}
                  onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                  placeholder="Kérem adja meg az elutasítás indokát..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAction(null)} className="flex-1">
                  Vissza
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Mentés..." : "Elutasítás"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
