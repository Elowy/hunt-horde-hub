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
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AvailableHunter {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  hunter_license_number: string | null;
  hunter_category: string | null;
}

export const AddExistingHunterDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [availableHunters, setAvailableHunters] = useState<AvailableHunter[]>([]);
  const [selectedHunter, setSelectedHunter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingHunters, setLoadingHunters] = useState(false);

  useEffect(() => {
    if (open) {
      loadAvailableHunters();
    }
  }, [open]);

  const loadAvailableHunters = async () => {
    setLoadingHunters(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get hunters who don't have a society yet and have hunter role
      const { data: hunterRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "hunter");

      if (!hunterRoles) {
        setAvailableHunters([]);
        return;
      }

      const hunterIds = hunterRoles.map((r) => r.user_id);

      // Get profiles of hunters without society
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, contact_name, contact_email, hunter_license_number, hunter_category")
        .in("id", hunterIds)
        .is("hunter_society_id", null)
        .order("contact_name");

      if (error) throw error;

      setAvailableHunters(profiles || []);
    } catch (error: any) {
      console.error("Error loading hunters:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a vadászokat.",
        variant: "destructive",
      });
    } finally {
      setLoadingHunters(false);
    }
  };

  const handleAddHunter = async () => {
    if (!selectedHunter) {
      toast({
        title: "Hiba",
        description: "Kérjük válasszon ki egy vadászt!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the database function
      const { error } = await supabase.rpc("add_hunter_to_society", {
        _hunter_user_id: selectedHunter,
        _society_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "A vadász sikeresen hozzáadva a vadásztársasághoz.",
      });

      setSelectedHunter("");
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error adding hunter:", error);
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült hozzáadni a vadászt.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getHunterCategoryLabel = (category: string | null) => {
    if (!category) return "";
    const labels: Record<string, string> = {
      tag: "Tag",
      vendeg: "Vendég",
      bervadasz: "Bérvadász",
      ib_vendeg: "IB Vendég",
      trofeas_vadasz: "Trófeás vadász",
      egyeb: "Egyéb",
    };
    return labels[category] || category;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <UserPlus className="h-4 w-4 mr-2" />
          Létező vadász hozzáadása
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Létező vadász hozzáadása</DialogTitle>
          <DialogDescription>
            Válasszon ki egy vadászt, aki még nem tartozik vadásztársasághoz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vadász kiválasztása</label>
            <Select
              value={selectedHunter}
              onValueChange={setSelectedHunter}
              disabled={loadingHunters}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingHunters
                      ? "Betöltés..."
                      : availableHunters.length === 0
                      ? "Nincs elérhető vadász"
                      : "Válasszon vadászt"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableHunters.map((hunter) => (
                  <SelectItem key={hunter.id} value={hunter.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {hunter.contact_name || hunter.contact_email || "Név nélkül"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {hunter.hunter_license_number && `Engedély: ${hunter.hunter_license_number}`}
                        {hunter.hunter_category && ` • ${getHunterCategoryLabel(hunter.hunter_category)}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button
              onClick={handleAddHunter}
              disabled={loading || !selectedHunter}
            >
              {loading ? "Hozzáadás..." : "Hozzáadás"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
