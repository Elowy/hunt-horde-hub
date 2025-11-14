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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PriceSetting {
  id: string;
  species: string;
  class: string;
  price_per_kg: number;
}

const speciesOptions = [
  { value: "🦌 Szarvas", label: "🦌 Szarvas" },
  { value: "🐗 Vaddisznó", label: "🐗 Vaddisznó" },
  { value: "🐏 Őz", label: "🐏 Őz" },
];

const classOptions = ["I", "II", "III", "IV"];

export const PriceSettingsDialog = ({ onPriceUpdated }: { onPriceUpdated: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPriceSettings();
    }
  }, [open]);

  const fetchPriceSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("price_settings")
        .select("*")
        .eq("user_id", user.id)
        .order("species", { ascending: true });

      if (error) throw error;
      setPriceSettings(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const [tempPrices, setTempPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize temp prices from settings
    const prices: Record<string, number> = {};
    priceSettings.forEach(setting => {
      const key = `${setting.species}_${setting.class}`;
      prices[key] = setting.price_per_kg;
    });
    setTempPrices(prices);
  }, [priceSettings]);

  const handlePriceChange = (species: string, animalClass: string, price: number) => {
    const key = `${species}_${animalClass}`;
    setTempPrices(prev => ({ ...prev, [key]: price }));
  };

  const handleSaveAll = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = Object.entries(tempPrices).map(([key, price]) => {
        const [species, animalClass] = key.split('_');
        return {
          user_id: user.id,
          species,
          class: animalClass,
          price_per_kg: price,
        };
      });

      const { error } = await supabase
        .from("price_settings")
        .upsert(updates, {
          onConflict: "user_id,species,class"
        });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Árak mentve és frissítve!",
      });

      await fetchPriceSettings();
      setOpen(false); // Close dialog
      onPriceUpdated(); // Trigger parent refresh
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

  const getPriceForCell = (species: string, animalClass: string) => {
    const key = `${species}_${animalClass}`;
    return tempPrices[key] || 0;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10">
          <Settings className="h-4 w-4 mr-2" />
          Árak beállítása
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kilonkénti árak beállítása</DialogTitle>
          <DialogDescription>
            Állítsa be a kilonkénti árakat vadfajonként és osztályonként (Ft/kg)
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Vadfaj</TableHead>
                {classOptions.map((cls) => (
                  <TableHead key={cls} className="text-center">{cls}. osztály</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {speciesOptions.map((species) => (
                <TableRow key={species.value}>
                  <TableCell className="font-medium">{species.label}</TableCell>
                  {classOptions.map((cls) => (
                    <TableCell key={cls}>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        value={getPriceForCell(species.value, cls)}
                        onChange={(e) =>
                          handlePriceChange(species.value, cls, parseFloat(e.target.value) || 0)
                        }
                        disabled={loading}
                        className="w-full"
                        placeholder="0"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-6 flex justify-end gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="vat">ÁFA (%):</Label>
              <Input
                id="vat"
                type="number"
                min="0"
                max="100"
                className="w-20"
                placeholder="27"
              />
            </div>
            <Button onClick={handleSaveAll} disabled={loading}>
              {loading ? "Mentés..." : "Összes ár mentése"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
