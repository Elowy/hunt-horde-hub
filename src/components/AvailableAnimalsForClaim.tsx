import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimalClaimButton } from "./AnimalClaimButton";

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  weight: number | null;
  class: string | null;
  storage_locations: {
    name: string;
  };
}

export const AvailableAnimalsForClaim = () => {
  const { toast } = useToast();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from("animals")
        .select(`
          id,
          animal_id,
          species,
          weight,
          class,
          storage_locations!inner(name)
        `)
        .eq("is_transported", false)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnimals(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az állatokat: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Elérhető állatok</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  if (animals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Elérhető állatok</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Jelenleg nincsenek elérhető állatok a hűtőben.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Elérhető állatok igényléshez</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {animals.map((animal) => (
            <div
              key={animal.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="font-semibold text-lg">{animal.animal_id}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary">{animal.species}</Badge>
                  {animal.class && <Badge variant="outline">{animal.class}</Badge>}
                  {animal.weight && (
                    <Badge variant="outline">{animal.weight} kg</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Hűtő: {animal.storage_locations.name}
                </div>
              </div>
              <div className="ml-4">
                <AnimalClaimButton
                  animalId={animal.id}
                  animalIdentifier={animal.animal_id}
                  onClaimed={fetchAnimals}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
