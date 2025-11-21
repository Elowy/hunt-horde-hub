import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Building2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface HunterSociety {
  id: string;
  company_name: string;
  joined_at: string;
  membership_id: string;
}

interface AvailableSociety {
  id: string;
  company_name: string;
}

interface ManageHunterSocietiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hunterId: string;
  hunterName: string;
  onUpdate: () => void;
}

export function ManageHunterSocietiesDialog({
  open,
  onOpenChange,
  hunterId,
  hunterName,
  onUpdate,
}: ManageHunterSocietiesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentSocieties, setCurrentSocieties] = useState<HunterSociety[]>([]);
  const [availableSocieties, setAvailableSocieties] = useState<AvailableSociety[]>([]);
  const [selectedSociety, setSelectedSociety] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, hunterId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch hunter's current societies
      const { data: membershipData, error: membershipError } = await supabase
        .from("hunter_society_members")
        .select(`
          id,
          hunter_society_id,
          joined_at,
          profiles!hunter_society_members_hunter_society_id_fkey (
            id,
            company_name
          )
        `)
        .eq("hunter_id", hunterId);

      if (membershipError) throw membershipError;

      const societies = membershipData?.map((m: any) => ({
        id: m.profiles.id,
        company_name: m.profiles.company_name,
        joined_at: m.joined_at,
        membership_id: m.id,
      })) || [];

      setCurrentSocieties(societies);

      // Fetch all hunter societies (user_type = 'hunter_society')
      const { data: allSocieties, error: societiesError } = await supabase
        .from("profiles")
        .select("id, company_name")
        .eq("user_type", "hunter_society")
        .order("company_name");

      if (societiesError) throw societiesError;

      // Filter out societies the hunter is already a member of
      const currentSocietyIds = societies.map((s: HunterSociety) => s.id);
      const available = allSocieties?.filter(
        (s: AvailableSociety) => !currentSocietyIds.includes(s.id)
      ) || [];

      setAvailableSocieties(available);
    } catch (error: any) {
      console.error("Error fetching societies:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a társaságokat.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSociety = async () => {
    if (!selectedSociety) {
      toast({
        title: "Figyelmeztetés",
        description: "Kérlek válassz egy társaságot!",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("hunter_society_members")
        .insert({
          hunter_id: hunterId,
          hunter_society_id: selectedSociety,
        });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Vadász hozzáadva a társasághoz.",
      });

      setSelectedSociety("");
      await fetchData();
      onUpdate();
    } catch (error: any) {
      console.error("Error adding society:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeSociety = async (membershipId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("hunter_society_members")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Vadász eltávolítva a társaságból.",
      });

      await fetchData();
      onUpdate();
    } catch (error: any) {
      console.error("Error removing society:", error);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Társasági tagságok kezelése
          </DialogTitle>
          <DialogDescription>
            {hunterName} vadász társasági tagságainak kezelése
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Societies */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Jelenlegi társaságok ({currentSocieties.length})
            </h3>
            {currentSocieties.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nincs társasági tagság
              </p>
            ) : (
              <div className="space-y-2">
                {currentSocieties.map((society) => (
                  <div
                    key={society.membership_id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <div>
                      <p className="font-medium">{society.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Csatlakozott: {format(new Date(society.joined_at), "PPP", { locale: hu })}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSociety(society.membership_id)}
                      disabled={loading || currentSocieties.length === 1}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eltávolítás
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {currentSocieties.length === 1 && (
              <p className="text-sm text-muted-foreground mt-2">
                * Az utolsó társaság nem távolítható el
              </p>
            )}
          </div>

          <Separator />

          {/* Add New Society */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Új társaság hozzáadása
            </h3>
            {availableSocieties.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nincs több elérhető társaság
              </p>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={selectedSociety}
                  onValueChange={setSelectedSociety}
                  disabled={loading}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Válasszon társaságot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSocieties.map((society) => (
                      <SelectItem key={society.id} value={society.id}>
                        {society.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addSociety} disabled={loading || !selectedSociety}>
                  Hozzáadás
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
