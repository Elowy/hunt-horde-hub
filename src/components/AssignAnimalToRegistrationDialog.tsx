import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  weight: number | null;
  gender: string | null;
  age: string | null;
}

interface AssignAnimalToRegistrationDialogProps {
  registrationId: string;
  isHiredHunter: boolean;
  hunterName: string | null;
  registrationSecurityZoneId: string;
  onAnimalAssigned: () => void;
}

export const AssignAnimalToRegistrationDialog = ({ 
  registrationId,
  isHiredHunter,
  hunterName,
  registrationSecurityZoneId,
  onAnimalAssigned 
}: AssignAnimalToRegistrationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [assignedAnimals, setAssignedAnimals] = useState<Animal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchUnassignedAnimals();
      fetchAssignedAnimals();
    }
  }, [open]);

  const fetchUnassignedAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("id, animal_id, species, weight, gender, age")
        .is("hunting_registration_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnimals(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAssignedAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("id, animal_id, species, weight, gender, age")
        .eq("hunting_registration_id", registrationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssignedAnimals(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssign = async () => {
    if (!selectedAnimalId) {
      toast({
        title: "Hiba",
        description: "Válasszon egy állatot!",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Determine hunter type
      const hunterType = isHiredHunter ? "bérvadász" : "tag";
      
      // Update animal with registration data
      const { error } = await supabase
        .from("animals")
        .update({ 
          hunting_registration_id: registrationId,
          hunter_name: hunterName || "Névtelen",
          hunter_type: hunterType,
          security_zone_id: registrationSecurityZoneId
        })
        .eq("id", selectedAnimalId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Állat hozzárendelve a beiratkozáshoz!",
      });

      setSelectedAnimalId("");
      fetchUnassignedAnimals();
      fetchAssignedAnimals();
      onAnimalAssigned();
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

  const handleUnassign = async (animalId: string) => {
    try {
      setLoading(true);
      
      // Remove assignment from animal
      const { error } = await supabase
        .from("animals")
        .update({ 
          hunting_registration_id: null,
          hunter_name: null,
          hunter_type: null,
          security_zone_id: null
        })
        .eq("id", animalId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Állat eltávolítva a beiratkozásból!",
      });

      fetchUnassignedAnimals();
      fetchAssignedAnimals();
      onAnimalAssigned();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Állat hozzáadása
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Állatok kezelése</DialogTitle>
          <DialogDescription>
            Hozzárendelés és eltávolítás a vadászati beiratkozáshoz
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Hozzárendelt állatok */}
          {assignedAnimals.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base">Hozzárendelt állatok ({assignedAnimals.length})</Label>
              <div className="space-y-2">
                {assignedAnimals.map((animal) => (
                  <div key={animal.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium">{animal.animal_id} - {animal.species}</div>
                      <div className="text-muted-foreground">
                        {animal.weight && `${animal.weight} kg`}
                        {animal.gender && ` • ${animal.gender}`}
                        {animal.age && ` • ${animal.age}`}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnassign(animal.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Új állat hozzárendelése */}
          <div className="space-y-4">
            <Label className="text-base">Új állat hozzárendelése</Label>
            <div className="space-y-2">
              {animals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nincs elérhető állat a hozzárendeléshez.</p>
              ) : (
                <Select value={selectedAnimalId} onValueChange={setSelectedAnimalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon állatot" />
                  </SelectTrigger>
                  <SelectContent>
                    {animals.map((animal) => (
                      <SelectItem key={animal.id} value={animal.id}>
                        {animal.animal_id} - {animal.species}
                        {animal.weight && ` (${animal.weight} kg)`}
                        {animal.gender && ` - ${animal.gender}`}
                        {animal.age && ` - ${animal.age}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button onClick={handleAssign} disabled={loading || !selectedAnimalId || animals.length === 0} className="w-full">
              {loading ? "Hozzárendelés..." : "Hozzárendelés"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
