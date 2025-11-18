import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { ApprovePendingAnimalDialog } from "./ApprovePendingAnimalDialog";

interface PendingAnimal {
  id: string;
  species: string;
  gender: string | null;
  hunter_name: string;
  notes: string | null;
  submitted_at: string;
  approval_status: string;
  storage_location_id: string;
  hunter_society_id: string;
  storage_locations?: {
    name: string;
  };
}

export const PendingAnimalsList = () => {
  const { toast } = useToast();
  const [animals, setAnimals] = useState<PendingAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<PendingAnimal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPendingAnimals();
  }, []);

  const fetchPendingAnimals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pending_animals")
        .select(`
          *,
          storage_locations (
            name
          )
        `)
        .eq("approval_status", "pending")
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setAnimals(data || []);
    } catch (error: any) {
      console.error("Error fetching pending animals:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a függőben lévő állatokat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnimalClick = (animal: PendingAnimal) => {
    setSelectedAnimal(animal);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Jóváhagyásra váró állatok
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  if (animals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Jóváhagyásra váró állatok
          </CardTitle>
          <CardDescription>
            QR kód alapján beküldött állatok jóváhagyása
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nincs jóváhagyásra váró állat.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Jóváhagyásra váró állatok ({animals.length})
          </CardTitle>
          <CardDescription>
            QR kód alapján beküldött állatok jóváhagyása
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {animals.map((animal) => (
              <div
                key={animal.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleAnimalClick(animal)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{animal.species}</h3>
                      {animal.gender && (
                        <Badge variant="outline" className="text-xs">
                          {animal.gender}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Vadász:</span>
                        <span className="font-medium text-foreground">{animal.hunter_name}</span>
                      </div>
                      {animal.storage_locations && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>Helyszín:</span>
                          <span className="font-medium text-foreground">
                            {animal.storage_locations.name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(animal.submitted_at), "yyyy. MMM dd. HH:mm", {
                            locale: hu,
                          })}
                        </span>
                      </div>
                    </div>
                    {animal.notes && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {animal.notes}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    Jóváhagyás
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ApprovePendingAnimalDialog
        animal={selectedAnimal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={fetchPendingAnimals}
      />
    </>
  );
};
