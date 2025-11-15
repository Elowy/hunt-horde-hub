import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

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
  onAnimalAssigned: () => void;
}

export const AssignAnimalToRegistrationDialog = ({ registrationId, onAnimalAssigned }: AssignAnimalToRegistrationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchUnassignedAnimals();
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
      const { error } = await supabase
        .from("animals")
        .update({ hunting_registration_id: registrationId })
        .eq("id", selectedAnimalId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Állat hozzárendelve a beiratkozáshoz!",
      });

      setSelectedAnimalId("");
      setOpen(false);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Állat hozzárendelése vadászathoz</DialogTitle>
          <DialogDescription>
            Válassza ki a hozzárendelni kívánt állatot. Csak még nem hozzárendelt állatok jelennek meg.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Állat kiválasztása</Label>
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
          <Button onClick={handleAssign} disabled={loading || !selectedAnimalId} className="w-full">
            Hozzárendelés
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
