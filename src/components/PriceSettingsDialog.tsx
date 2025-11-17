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
import { Settings, Plus, Archive, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PriceSetting {
  id: string;
  species: string;
  class: string;
  price_per_kg: number;
  vat_rate: number;
  valid_from: string;
  valid_to: string | null;
  is_archived: boolean;
}

const speciesOptions = [
  { value: "🐏 Őz", label: "🐏 Őz" },
  { value: "🦌 Dám Szarvas", label: "🦌 Dám Szarvas" },
  { value: "🦌 Szika Szarvas", label: "🦌 Szika Szarvas" },
  { value: "🦌 Gím Szarvas", label: "🦌 Gím Szarvas" },
  { value: "🐗 Vaddisznó", label: "🐗 Vaddisznó" },
  { value: "🐏 Muflon", label: "🐏 Muflon" },
];

const classOptions = ["I", "II", "III", "IV"];

export const PriceSettingsDialog = ({ onPriceUpdated }: { onPriceUpdated: () => void }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<PriceSetting[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    validFrom: format(new Date(), "yyyy-MM-dd"),
    validTo: "",
    vat: "27",
  });
  const [tempPrices, setTempPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchPrices();
      // Initialize temp prices with empty values
      const initialPrices: Record<string, string> = {};
      speciesOptions.forEach(species => {
        classOptions.forEach(cls => {
          const key = `${species.value}_${cls}`;
          initialPrices[key] = "";
        });
      });
      setTempPrices(initialPrices);
    }
  }, [open]);

  const fetchPrices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("price_settings")
        .select("*")
        .eq("user_id", user.id)
        .order("valid_from", { ascending: false })
        .order("species", { ascending: true })
        .order("class", { ascending: true });

      if (error) throw error;
      setPrices(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePriceChange = (species: string, animalClass: string, value: string) => {
    const key = `${species}_${animalClass}`;
    setTempPrices(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one price is entered
    const hasPrice = Object.values(tempPrices).some(price => price && parseFloat(price) > 0);
    if (!hasPrice) {
      toast({
        title: "Hiba",
        description: "Adjon meg legalább egy árat!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve!");

      // Archive previous active prices
      const { error: archiveError } = await supabase
        .from("price_settings")
        .update({ 
          is_archived: true,
          valid_to: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .is("valid_to", null);

      if (archiveError) throw archiveError;

      // Insert new prices
      const newPrices = Object.entries(tempPrices)
        .filter(([_, price]) => price && parseFloat(price) > 0)
        .map(([key, price]) => {
          const [species, animalClass] = key.split('_');
          return {
            user_id: user.id,
            species,
            class: animalClass,
            price_per_kg: parseFloat(price),
            vat_rate: parseFloat(formData.vat),
            valid_from: new Date(formData.validFrom).toISOString(),
            valid_to: formData.validTo ? new Date(formData.validTo).toISOString() : null,
            is_archived: false,
          };
        });

      if (newPrices.length > 0) {
        const { error } = await supabase
          .from("price_settings")
          .insert(newPrices);

        if (error) throw error;
      }

      toast({
        title: "Siker!",
        description: "Új árlista hozzáadva!",
      });

      setFormData({ 
        validFrom: format(new Date(), "yyyy-MM-dd"),
        validTo: "",
        vat: "27"
      });
      const initialPrices: Record<string, string> = {};
      speciesOptions.forEach(species => {
        classOptions.forEach(cls => {
          const key = `${species.value}_${cls}`;
          initialPrices[key] = "";
        });
      });
      setTempPrices(initialPrices);
      setShowAddForm(false);
      fetchPrices();
      onPriceUpdated();
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

  const activePrices = prices.filter(p => !p.is_archived);
  const archivedPrices = prices.filter(p => p.is_archived);

  // Group prices by valid_from date for display
  const groupPricesByDate = (priceList: PriceSetting[]) => {
    const grouped: Record<string, PriceSetting[]> = {};
    priceList.forEach(price => {
      const dateKey = price.valid_from;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(price);
    });
    return grouped;
  };

  const activePriceGroups = groupPricesByDate(activePrices);
  const archivedPriceGroups = groupPricesByDate(archivedPrices);

  const renderPriceGroup = (dateKey: string, priceGroup: PriceSetting[]) => (
    <div key={dateKey} className="mb-6 border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            Érvényes: {format(new Date(dateKey), "yyyy. MM. dd.")}
            {priceGroup[0]?.valid_to && ` - ${format(new Date(priceGroup[0].valid_to), "yyyy. MM. dd.")}`}
          </span>
        </div>
        {priceGroup[0]?.is_archived ? (
          <Badge variant="secondary">
            <Archive className="h-3 w-3 mr-1" />
            Archivált
          </Badge>
        ) : (
          <Badge variant="default">Aktív</Badge>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Faj</TableHead>
            <TableHead>Osztály</TableHead>
            <TableHead className="text-right">Ár (Ft/kg)</TableHead>
            <TableHead className="text-right">ÁFA (%)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {priceGroup.map((price) => (
            <TableRow key={price.id}>
              <TableCell>{price.species}</TableCell>
              <TableCell>{price.class}</TableCell>
              <TableCell className="text-right font-medium">
                {price.price_per_kg.toLocaleString()} Ft
              </TableCell>
              <TableCell className="text-right">
                {price.vat_rate}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Settings className="mr-2 h-4 w-4" />
          Árak beállítása
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Árak beállítása</DialogTitle>
          <DialogDescription>
            Adja meg a különböző vadfajok és osztályok árát kilogrammonként.
          </DialogDescription>
        </DialogHeader>

        {!showAddForm ? (
          <div className="space-y-4">
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Új árlista hozzáadása
            </Button>

            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">
                  Aktív ({Object.keys(activePriceGroups).length})
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archivált ({Object.keys(archivedPriceGroups).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4 mt-4">
                {Object.entries(activePriceGroups).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nincs aktív árlista
                  </p>
                ) : (
                  Object.entries(activePriceGroups).map(([dateKey, priceGroup]) =>
                    renderPriceGroup(dateKey, priceGroup)
                  )
                )}
              </TabsContent>

              <TabsContent value="archived" className="space-y-4 mt-4">
                {Object.entries(archivedPriceGroups).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nincs archivált árlista
                  </p>
                ) : (
                  Object.entries(archivedPriceGroups).map(([dateKey, priceGroup]) =>
                    renderPriceGroup(dateKey, priceGroup)
                  )
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Érvényesség kezdete *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validTo">Érvényesség vége (opcionális)</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  min={formData.validFrom}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat">ÁFA (%) *</Label>
                <Input
                  id="vat"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.vat}
                  onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">Árak megadása (Ft/kg)</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faj</TableHead>
                    {classOptions.map(cls => (
                      <TableHead key={cls} className="text-center">{cls}. osztály</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {speciesOptions.map(species => (
                    <TableRow key={species.value}>
                      <TableCell className="font-medium">{species.label}</TableCell>
                      {classOptions.map(cls => {
                        const key = `${species.value}_${cls}`;
                        return (
                          <TableCell key={cls}>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              value={tempPrices[key] || ""}
                              onChange={(e) => handlePriceChange(species.value, cls, e.target.value)}
                              className="text-center"
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Mégse
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Mentés..." : "Mentés"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
