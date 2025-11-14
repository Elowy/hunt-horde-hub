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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  gender: string | null;
  weight: number | null;
  class: string | null;
  cooling_date: string | null;
  storage_location_id: string;
  hunter_name: string | null;
  hunter_type: string | null;
  age: string | null;
  condition: string | null;
  sample_id: string | null;
  sample_date: string | null;
  expiry_date: string | null;
  vet_check: boolean | null;
  vet_notes: string | null;
  notes: string | null;
}

interface StorageLocation {
  id: string;
  name: string;
}

interface PriceSetting {
  species: string;
  class: string;
  price_per_kg: number;
}

interface EditAnimalDialogProps {
  animal: Animal;
  locations: StorageLocation[];
  onAnimalUpdated: () => void;
}

export const EditAnimalDialog = ({ animal, locations, onAnimalUpdated }: EditAnimalDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [vatRate, setVatRate] = useState<number>(27);
  const [calculatedPrice, setCalculatedPrice] = useState<{ net: number; gross: number }>({ net: 0, gross: 0 });
  const [formData, setFormData] = useState({
    animal_id: animal.animal_id,
    species: animal.species,
    gender: animal.gender || "",
    weight: animal.weight?.toString() || "",
    class: animal.class || "",
    cooling_date: animal.cooling_date?.split('T')[0] || "",
    storage_location_id: animal.storage_location_id,
    hunter_name: animal.hunter_name || "",
    hunter_type: animal.hunter_type || "",
    age: animal.age || "",
    condition: animal.condition || "",
    sample_id: animal.sample_id || "",
    sample_date: animal.sample_date?.split('T')[0] || "",
    expiry_date: animal.expiry_date?.split('T')[0] || "",
    vet_check: animal.vet_check || false,
    vet_notes: animal.vet_notes || "",
    notes: animal.notes || "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        animal_id: animal.animal_id,
        species: animal.species,
        gender: animal.gender || "",
        weight: animal.weight?.toString() || "",
        class: animal.class || "",
        cooling_date: animal.cooling_date?.split('T')[0] || "",
        storage_location_id: animal.storage_location_id,
        hunter_name: animal.hunter_name || "",
        hunter_type: animal.hunter_type || "",
        age: animal.age || "",
        condition: animal.condition || "",
        sample_id: animal.sample_id || "",
        sample_date: animal.sample_date?.split('T')[0] || "",
        expiry_date: animal.expiry_date?.split('T')[0] || "",
        vet_check: animal.vet_check || false,
        vet_notes: animal.vet_notes || "",
        notes: animal.notes || "",
      });
    }
  }, [open, animal]);

  useEffect(() => {
    if (open) {
      fetchPriceSettings();
      fetchVatRate();
    }
  }, [open]);

  const calculatePrice = () => {
    if (!formData.weight || !formData.species || !formData.class) {
      setCalculatedPrice({ net: 0, gross: 0 });
      return;
    }

    const weight = parseFloat(formData.weight);
    if (isNaN(weight)) {
      setCalculatedPrice({ net: 0, gross: 0 });
      return;
    }

    const priceSetting = priceSettings.find(
      (p) => p.species === formData.species && p.class === formData.class
    );

    if (!priceSetting) {
      setCalculatedPrice({ net: 0, gross: 0 });
      return;
    }

    const netPrice = weight * priceSetting.price_per_kg;
    const grossPrice = netPrice * (1 + vatRate / 100);

    setCalculatedPrice({
      net: Math.round(netPrice),
      gross: Math.round(grossPrice),
    });
  };

  useEffect(() => {
    calculatePrice();
  }, [formData.weight, formData.species, formData.class, priceSettings, vatRate]);

  const fetchPriceSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("price_settings")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setPriceSettings(data || []);
    } catch (error: any) {
      console.error("Error fetching price settings:", error);
    }
  };

  const fetchVatRate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("vat_rate")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data?.vat_rate) {
        setVatRate(data.vat_rate);
      }
    } catch (error: any) {
      console.error("Error fetching VAT rate:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.animal_id.trim() || !formData.species) {
      toast({
        title: "Hiba",
        description: "Az azonosító és a vadfaj kötelező!",
        variant: "destructive",
      });
      return;
    }

    // Megerősítés kérése
    const confirmed = window.confirm(
      `Biztos módosítja a(z) ${animal.storage_location_id} helyszínről a(z) ${animal.animal_id} azonosítójú ${animal.species} vadfajú ${animal.weight || 0} kg súlyú vadat?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("animals")
        .update({
          animal_id: formData.animal_id,
          species: formData.species,
          gender: formData.gender || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          class: formData.class || null,
          cooling_date: formData.cooling_date || null,
          storage_location_id: formData.storage_location_id,
          hunter_name: formData.hunter_name || null,
          hunter_type: formData.hunter_type || null,
          age: formData.age || null,
          condition: formData.condition || null,
          sample_id: formData.sample_id || null,
          sample_date: formData.sample_date || null,
          expiry_date: formData.expiry_date || null,
          vet_check: formData.vet_check,
          vet_notes: formData.vet_notes || null,
          notes: formData.notes || null,
        })
        .eq("id", animal.id);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Állat módosítva!",
      });

      setOpen(false);
      onAnimalUpdated();
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
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Állat szerkesztése</DialogTitle>
          <DialogDescription>
            Módosítsa az állat adatait
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="animal_id">Azonosító *</Label>
              <Input
                id="animal_id"
                value={formData.animal_id}
                onChange={(e) => setFormData({ ...formData, animal_id: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="species">Vadfaj *</Label>
              <Select
                value={formData.species}
                onValueChange={(value) => setFormData({ ...formData, species: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="🦌 Szarvas">🦌 Szarvas</SelectItem>
                  <SelectItem value="🐗 Vaddisznó">🐗 Vaddisznó</SelectItem>
                  <SelectItem value="🐏 Őz">🐏 Őz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Nem</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="♂️ Hím">♂️ Hím</SelectItem>
                  <SelectItem value="♀️ Nőstény">♀️ Nőstény</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Osztály</Label>
              <Select
                value={formData.class}
                onValueChange={(value) => setFormData({ ...formData, class: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I">I. osztály</SelectItem>
                  <SelectItem value="II">II. osztály</SelectItem>
                  <SelectItem value="III">III. osztály</SelectItem>
                  <SelectItem value="IV">IV. osztály</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Súly (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                disabled={loading}
              />
            </div>

            {calculatedPrice.net > 0 && (
              <div className="col-span-2 bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nettó ár:</span>
                  <span className="text-lg font-bold">{calculatedPrice.net.toLocaleString("hu-HU")} Ft</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bruttó ár (ÁFA {vatRate}%):</span>
                  <span className="text-lg">{calculatedPrice.gross.toLocaleString("hu-HU")} Ft</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="storage_location_id">Helyszín</Label>
              <Select
                value={formData.storage_location_id}
                onValueChange={(value) => setFormData({ ...formData, storage_location_id: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hunter_name">Vadász neve</Label>
              <Input
                id="hunter_name"
                value={formData.hunter_name}
                onChange={(e) => setFormData({ ...formData, hunter_name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hunter_type">Vadász típus</Label>
              <Input
                id="hunter_type"
                value={formData.hunter_type}
                onChange={(e) => setFormData({ ...formData, hunter_type: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Kor</Label>
              <Input
                id="age"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Állapot</Label>
              <Input
                id="condition"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooling_date">Hűtés dátuma</Label>
              <Input
                id="cooling_date"
                type="date"
                value={formData.cooling_date}
                onChange={(e) => setFormData({ ...formData, cooling_date: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Lejárat</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample_id">Minta azonosító</Label>
              <Input
                id="sample_id"
                value={formData.sample_id}
                onChange={(e) => setFormData({ ...formData, sample_id: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample_date">Mintavétel dátuma</Label>
              <Input
                id="sample_date"
                type="date"
                value={formData.sample_date}
                onChange={(e) => setFormData({ ...formData, sample_date: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="vet_check"
              checked={formData.vet_check}
              onCheckedChange={(checked) => setFormData({ ...formData, vet_check: checked as boolean })}
              disabled={loading}
            />
            <Label htmlFor="vet_check">Állatorvosi vizsgálat elvégezve</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vet_notes">Állatorvosi jegyzet</Label>
            <Textarea
              id="vet_notes"
              value={formData.vet_notes}
              onChange={(e) => setFormData({ ...formData, vet_notes: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Jegyzetek</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
