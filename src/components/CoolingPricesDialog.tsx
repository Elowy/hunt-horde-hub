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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Plus, Archive, Calendar } from "lucide-react";
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
import { SPECIES_OPTIONS } from "@/lib/speciesConstants";

interface CoolingPrice {
  id: string;
  cooling_price_per_kg: number;
  cooling_vat_rate: number;
  valid_from: string;
  valid_to: string | null;
  is_archived: boolean;
  species: string | null;
  class: string | null;
}

interface CoolingPricesDialogProps {
  storageLocationId: string;
  storageLocationName: string;
}

const ALL = "__all__";
const CLASS_OPTIONS = [
  { value: "I", label: "I. osztály" },
  { value: "II", label: "II. osztály" },
  { value: "III", label: "III. osztály" },
  { value: "IV", label: "IV. osztály" },
];

export const CoolingPricesDialog = ({ storageLocationId, storageLocationName }: CoolingPricesDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<CoolingPrice[]>([]);
  const [formData, setFormData] = useState({
    coolingPrice: "",
    coolingVat: "27",
    validFrom: format(new Date(), "yyyy-MM-dd"),
    validTo: "",
    species: ALL,
    class: ALL,
  });

  useEffect(() => {
    if (open) {
      fetchPrices();
    }
  }, [open]);

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("cooling_prices")
        .select("*")
        .eq("storage_location_id", storageLocationId)
        .order("valid_from", { ascending: false });

      if (error) throw error;
      setPrices((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.coolingPrice) {
      toast({
        title: "Hiba",
        description: "Adja meg a hűtési díjat!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve!");

      const speciesValue = formData.species === ALL ? null : formData.species;
      const classValue = formData.class === ALL ? null : formData.class;

      // Archive previous active prices for the same species/class scope
      let archiveQuery = supabase
        .from("cooling_prices")
        .update({
          is_archived: true,
          valid_to: new Date().toISOString(),
        })
        .eq("storage_location_id", storageLocationId)
        .is("valid_to", null);

      archiveQuery = speciesValue === null
        ? archiveQuery.is("species", null)
        : archiveQuery.eq("species", speciesValue);
      archiveQuery = classValue === null
        ? archiveQuery.is("class", null)
        : archiveQuery.eq("class", classValue);

      const { error: archiveError } = await archiveQuery;
      if (archiveError) throw archiveError;

      const { error } = await supabase
        .from("cooling_prices")
        .insert({
          storage_location_id: storageLocationId,
          user_id: user.id,
          cooling_price_per_kg: parseFloat(formData.coolingPrice),
          cooling_vat_rate: parseFloat(formData.coolingVat),
          valid_from: new Date(formData.validFrom).toISOString(),
          valid_to: formData.validTo ? new Date(formData.validTo).toISOString() : null,
          is_archived: false,
          species: speciesValue,
          class: classValue,
        } as any);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Új árlista hozzáadva!",
      });

      setFormData({
        coolingPrice: "",
        coolingVat: "27",
        validFrom: format(new Date(), "yyyy-MM-dd"),
        validTo: "",
        species: ALL,
        class: ALL,
      });
      fetchPrices();
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

  const handleArchive = async (priceId: string) => {
    try {
      const { error } = await supabase
        .from("cooling_prices")
        .update({
          is_archived: true,
          valid_to: new Date().toISOString(),
        })
        .eq("id", priceId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Árlista archiválva!",
      });

      fetchPrices();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const classLabel = (value: string | null) => {
    if (!value) return "Összes";
    return CLASS_OPTIONS.find((o) => o.value === value)?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DollarSign className="h-4 w-4 mr-2" />
          Hűtési árak
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hűtési árak - {storageLocationName}</DialogTitle>
          <DialogDescription>
            Adhat meg általános árat, vagy faj/osztály szerinti egyedi árat. Ha nincs egyedi ár, az általános („Összes”) ár érvényesül.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 border-b pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="species">Vad faj</Label>
              <Select
                value={formData.species}
                onValueChange={(v) => setFormData({ ...formData, species: v })}
              >
                <SelectTrigger id="species">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Összes faj</SelectItem>
                  {SPECIES_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Osztály</Label>
              <Select
                value={formData.class}
                onValueChange={(v) => setFormData({ ...formData, class: v })}
              >
                <SelectTrigger id="class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Összes osztály</SelectItem>
                  {CLASS_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coolingPrice">Hűtési díj (Ft/kg) *</Label>
              <Input
                id="coolingPrice"
                type="number"
                step="0.01"
                value={formData.coolingPrice}
                onChange={(e) => setFormData({ ...formData, coolingPrice: e.target.value })}
                placeholder="pl. 500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coolingVat">ÁFA (%) *</Label>
              <Input
                id="coolingVat"
                type="number"
                step="0.01"
                value={formData.coolingVat}
                onChange={(e) => setFormData({ ...formData, coolingVat: e.target.value })}
                placeholder="pl. 27"
                required
              />
            </div>

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
              <Label htmlFor="validTo">Érvényesség vége</Label>
              <Input
                id="validTo"
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                placeholder="Hagyd üresen ha folyamatos"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {loading ? "Mentés..." : "Új árlista hozzáadása"}
          </Button>
        </form>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Ártörténet</h3>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faj</TableHead>
                  <TableHead>Osztály</TableHead>
                  <TableHead>Ár (Ft/kg)</TableHead>
                  <TableHead>ÁFA (%)</TableHead>
                  <TableHead>Érvényes tól</TableHead>
                  <TableHead>Érvényes ig</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Még nincs árlista
                    </TableCell>
                  </TableRow>
                ) : (
                  prices.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell>{price.species || <span className="text-muted-foreground">Összes</span>}</TableCell>
                      <TableCell>{classLabel(price.class)}</TableCell>
                      <TableCell className="font-medium">{price.cooling_price_per_kg} Ft</TableCell>
                      <TableCell>{price.cooling_vat_rate}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(price.valid_from), "yyyy.MM.dd")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {price.valid_to ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(price.valid_to), "yyyy.MM.dd")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {price.is_archived ? (
                          <Badge variant="secondary">
                            <Archive className="h-3 w-3 mr-1" />
                            Archivált
                          </Badge>
                        ) : (
                          <Badge variant="default">Aktív</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!price.is_archived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(price.id)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
