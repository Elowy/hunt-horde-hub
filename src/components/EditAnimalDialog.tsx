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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimalHistoryDialog } from "./AnimalHistoryDialog";
import { getGameTypesForSpecies, isBigGameSpecies, SMALL_GAME_TYPE } from "@/lib/speciesConstants";

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
  shooting_date: string | null;
  sample_id: string | null;
  sample_date: string | null;
  expiry_date: string | null;
  vet_check: boolean | null;
  vet_notes: string | null;
  notes: string | null;
  security_zone_id: string | null;
  vet_sample_id: string | null;
  vet_doctor_name: string | null;
  vet_result: string | null;
  is_transported?: boolean | null;
  transported_at?: string | null;
  transport_price_per_kg?: number | null;
  transport_vat_rate?: number | null;
  transport_cooling_price?: number | null;
  transport_cooling_vat_rate?: number | null;
  game_type?: string | null;
  hunter_license_number?: string | null;
  judgement_number?: string | null;
  average_tusk_length?: number | null;
  invoice_number?: string | null;
  usage_type?: string | null;
  buyer_type?: string | null;
  buyer_name?: string | null;
  buyer_zip?: string | null;
  buyer_city?: string | null;
  buyer_address?: string | null;
  buyer_tax_number?: string | null;
}

interface StorageLocation {
  id: string;
  name: string;
}

interface SecurityZone {
  id: string;
  name: string;
  settlement_id: string | null;
  settlements: {
    name: string;
  } | null;
}

interface Hunter {
  id: string;
  contact_name: string | null;
  hunter_category: string | null;
}

interface PriceSetting {
  species: string;
  class: string;
  price_per_kg: number;
}

interface EpidemicMeasure {
  id: string;
  name: string;
  severity: string;
  affected_species: string[];
  shooting_fee: number;
  sampling_fee: number;
  price_per_unit: number;
  is_active: boolean;
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
  const [epidemicMeasures, setEpidemicMeasures] = useState<EpidemicMeasure[]>([]);
  const [securityZones, setSecurityZones] = useState<SecurityZone[]>([]);
  const [hunters, setHunters] = useState<Hunter[]>([]);
  const [isCustomHunter, setIsCustomHunter] = useState(false);
  const [vatRate, setVatRate] = useState<number>(27);
  const [calculatedPrice, setCalculatedPrice] = useState<{ net: number; gross: number }>({ net: 0, gross: 0 });
  const buildInitialForm = () => ({
    animal_id: animal.animal_id,
    species: animal.species,
    gender: animal.gender || "",
    weight: animal.weight?.toString() || "",
    class: animal.class || "",
    cooling_date: animal.cooling_date?.split('T')[0] || "",
    shooting_date: animal.shooting_date || "",
    storage_location_id: animal.storage_location_id,
    hunter_name: animal.hunter_name || "",
    hunter_type: animal.hunter_type || "",
    age: animal.age || "",
    sample_id: animal.sample_id || "",
    sample_date: animal.sample_date?.split('T')[0] || "",
    expiry_date: animal.expiry_date?.split('T')[0] || "",
    vet_check: animal.vet_check || false,
    vet_notes: animal.vet_notes || "",
    notes: animal.notes || "",
    security_zone_id: animal.security_zone_id || "",
    vet_sample_id: animal.vet_sample_id || "",
    vet_doctor_name: animal.vet_doctor_name || "",
    vet_result: animal.vet_result || "",
    game_type: animal.game_type || "",
    hunter_license_number: animal.hunter_license_number || "",
    judgement_number: animal.judgement_number || "",
    average_tusk_length: animal.average_tusk_length?.toString() || "",
    usage_type: animal.usage_type || "",
    buyer_type: animal.buyer_type || "",
    buyer_name: animal.buyer_name || "",
    buyer_zip: animal.buyer_zip || "",
    buyer_city: animal.buyer_city || "",
    buyer_address: animal.buyer_address || "",
    buyer_tax_number: animal.buyer_tax_number || "",
  });

  const buildInitialPricing = () => {
    const w = animal.weight || 0;
    const netTotal = (animal.transport_price_per_kg && w) ? animal.transport_price_per_kg * w : 0;
    const vat = animal.transport_vat_rate ?? 0;
    return {
      netPrice: netTotal ? String(Math.round(netTotal)) : "",
      grossPrice: netTotal ? String(Math.round(netTotal * (1 + vat / 100))) : "",
      priceVat: animal.transport_vat_rate != null ? String(animal.transport_vat_rate) : "",
      coolingPricePerKg: animal.transport_cooling_price != null ? String(animal.transport_cooling_price) : "",
      coolingVat: animal.transport_cooling_vat_rate != null ? String(animal.transport_cooling_vat_rate) : "",
      invoiceNumber: animal.invoice_number || "",
    };
  };

  const [formData, setFormData] = useState(buildInitialForm);
  const [pricing, setPricing] = useState(buildInitialPricing);
  const [pricingTouched, setPricingTouched] = useState<Record<string, boolean>>(() => {
    const init = buildInitialPricing();
    const touched: Record<string, boolean> = {};
    Object.entries(init).forEach(([k, v]) => { if (v) touched[k] = true; });
    return touched;
  });

  useEffect(() => {
    if (open) {
      setFormData(buildInitialForm());
      setPricing(buildInitialPricing());
      const init = buildInitialPricing();
      const touched: Record<string, boolean> = {};
      Object.entries(init).forEach(([k, v]) => { if (v) touched[k] = true; });
      setPricingTouched(touched);

      fetchSecurityZones();
      fetchHunters();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, animal]);

  // Check if hunter is custom after hunters are loaded
  useEffect(() => {
    if (open && hunters.length > 0 && animal.hunter_name) {
      const hunterExists = hunters.find(h => h.contact_name === animal.hunter_name);
      setIsCustomHunter(!hunterExists);
    }
  }, [hunters, animal.hunter_name, open]);

  useEffect(() => {
    if (open) {
      fetchPriceSettings();
      fetchVatRate();
      fetchEpidemicMeasures();
    }
  }, [open]);

  const calculatePrice = () => {
    // Ha az állat már el van szállítva, ne változtassuk az árat
    if (animal.is_transported || animal.transported_at) {
      if (animal.transport_price_per_kg && formData.weight) {
        const weight = parseFloat(formData.weight);
        const vat = animal.transport_vat_rate || vatRate;
        const netPrice = weight * animal.transport_price_per_kg;
        const grossPrice = netPrice * (1 + vat / 100);
        setCalculatedPrice({
          net: Math.round(netPrice),
          gross: Math.round(grossPrice),
        });
      }
      return;
    }

    if (!formData.species) {
      setCalculatedPrice({ net: 0, gross: 0 });
      return;
    }

    // Check for active epidemic measure for this species
    const activeMeasure = epidemicMeasures.find(
      measure => measure.is_active && measure.affected_species.includes(formData.species)
    );

    if (activeMeasure) {
      // For epidemic measures, calculate per unit (not by weight)
      const netPrice = activeMeasure.price_per_unit + activeMeasure.shooting_fee + activeMeasure.sampling_fee;
      const grossPrice = netPrice * (1 + vatRate / 100);
      setCalculatedPrice({
        net: Math.round(netPrice),
        gross: Math.round(grossPrice),
      });
      return;
    }

    // Normal calculation by weight
    if (!formData.weight || !formData.class) {
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
  }, [formData.weight, formData.species, formData.class, priceSettings, vatRate, epidemicMeasures]);

  // Best-match cooling price lookup
  const fetchBestCoolingPrice = async (storageLocationId: string, species: string, klass: string) => {
    if (!storageLocationId) return null;
    const nowIso = new Date().toISOString();
    const { data: allPrices } = await supabase
      .from("cooling_prices")
      .select("cooling_price_per_kg, cooling_vat_rate, species, class, valid_from, valid_to")
      .eq("storage_location_id", storageLocationId)
      .eq("is_archived", false)
      .or(`valid_to.is.null,valid_to.gt.${nowIso}`)
      .order("valid_from", { ascending: false });
    const candidates = (allPrices as any[] | null) || [];
    const matchScore = (p: any) => {
      const sMatch = p.species === species;
      const cMatch = p.class === klass;
      if (sMatch && cMatch) return 4;
      if (sMatch && p.class === null) return 3;
      if (p.species === null && cMatch) return 2;
      if (p.species === null && p.class === null) return 1;
      return 0;
    };
    return candidates
      .map((p) => ({ p, score: matchScore(p) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.p ?? null;
  };

  // Auto-fill pricing fields from current price list (skip fields user has touched / already set)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const activeMeasure = epidemicMeasures.find(
        (m) => m.is_active && m.affected_species.includes(formData.species)
      );
      let netTotal = 0;
      let vat = vatRate;
      if (activeMeasure) {
        netTotal = activeMeasure.shooting_fee + activeMeasure.sampling_fee + activeMeasure.price_per_unit;
        vat = (activeMeasure as any).vat_rate || vatRate;
      } else if (formData.species && formData.class) {
        const ps = priceSettings.find((p) => p.species === formData.species && p.class === formData.class);
        if (ps && formData.weight) netTotal = parseFloat(formData.weight) * ps.price_per_kg;
      }

      let coolingPerKg = 0;
      let coolingVatVal = 0;
      if ((activeMeasure as any)?.cooling_price_per_kg) {
        coolingPerKg = (activeMeasure as any).cooling_price_per_kg;
        coolingVatVal = (activeMeasure as any).vat_rate || vatRate;
      } else if (formData.storage_location_id) {
        const best = await fetchBestCoolingPrice(formData.storage_location_id, formData.species, formData.class);
        if (best) {
          coolingPerKg = Number(best.cooling_price_per_kg) || 0;
          coolingVatVal = Number(best.cooling_vat_rate) || 0;
        }
      }
      if (cancelled) return;
      setPricing((prev) => {
        const next = { ...prev };
        if (!pricingTouched.netPrice) next.netPrice = netTotal ? String(Math.round(netTotal)) : "";
        if (!pricingTouched.priceVat) next.priceVat = String(vat);
        if (!pricingTouched.grossPrice) next.grossPrice = netTotal ? String(Math.round(netTotal * (1 + vat / 100))) : "";
        if (!pricingTouched.coolingPricePerKg) next.coolingPricePerKg = coolingPerKg ? String(coolingPerKg) : "";
        if (!pricingTouched.coolingVat) next.coolingVat = coolingVatVal ? String(coolingVatVal) : "";
        return next;
      });
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.weight, formData.species, formData.class, formData.storage_location_id, priceSettings, vatRate, epidemicMeasures]);

  const handlePricingChange = (field: keyof typeof pricing, value: string) => {
    setPricing((prev) => {
      const next = { ...prev, [field]: value };
      const vat = parseFloat(next.priceVat) || 0;
      if (field === "netPrice") {
        const n = parseFloat(value);
        if (!isNaN(n)) next.grossPrice = String(Math.round(n * (1 + vat / 100)));
      } else if (field === "grossPrice") {
        const g = parseFloat(value);
        if (!isNaN(g)) next.netPrice = String(Math.round(g / (1 + vat / 100)));
      } else if (field === "priceVat") {
        const n = parseFloat(next.netPrice);
        if (!isNaN(n)) next.grossPrice = String(Math.round(n * (1 + vat / 100)));
      }
      return next;
    });
    setPricingTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "netPrice" || field === "priceVat") setPricingTouched((p) => ({ ...p, grossPrice: true }));
    if (field === "grossPrice") setPricingTouched((p) => ({ ...p, netPrice: true }));
  };

  const fetchSecurityZones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("security_zones")
        .select(`
          id,
          name,
          settlement_id,
          settlements (
            name
          )
        `)
        .eq("user_id", user.id)
        .order("display_order");

      if (error) throw error;
      setSecurityZones(data || []);
    } catch (error: any) {
      console.error("Error fetching security zones:", error);
    }
  };

  const fetchHunters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get hunter user IDs from user_roles
      const { data: hunterRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "hunter");

      if (rolesError) throw rolesError;

      if (!hunterRoles || hunterRoles.length === 0) {
        setHunters([]);
        return;
      }

      const hunterIds = hunterRoles.map(r => r.user_id);

      // Get profiles for these hunters
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, contact_name, hunter_category")
        .in("id", hunterIds)
        .not("contact_name", "is", null);

      if (profilesError) throw profilesError;
      setHunters(profiles || []);
    } catch (error: any) {
      console.error("Error fetching hunters:", error);
    }
  };

  const getHunterCategoryDisplay = (category: string | null): string => {
    if (!category) return "";
    const categoryMap: { [key: string]: string } = {
      "tag": "Tag",
      "vendeg": "Vendég",
      "bervadasz": "Bérvadász",
      "ib_vendeg": "IB Vendég",
      "trofeas_vadasz": "Trófeás vadász",
      "egyeb": "Egyéb"
    };
    return categoryMap[category] || category;
  };

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

  const fetchEpidemicMeasures = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("epidemic_measures")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      setEpidemicMeasures(data || []);
    } catch (error: any) {
      console.error("Error fetching epidemic measures:", error);
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
      const weightNum = formData.weight ? parseFloat(formData.weight) : 0;
      const netTotal = parseFloat(pricing.netPrice);
      const vatVal = parseFloat(pricing.priceVat);
      const coolingPerKg = parseFloat(pricing.coolingPricePerKg);
      const coolingVatNum = parseFloat(pricing.coolingVat);

      const { error } = await supabase
        .from("animals")
        .update({
          animal_id: formData.animal_id,
          species: formData.species,
          gender: formData.gender || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          class: formData.class || null,
          cooling_date: formData.cooling_date || null,
          shooting_date: formData.shooting_date || null,
          storage_location_id: formData.storage_location_id,
          hunter_name: formData.hunter_name || null,
          hunter_type: formData.hunter_type || null,
          age: formData.age || null,
          sample_id: formData.sample_id || null,
          sample_date: formData.sample_date || null,
          expiry_date: formData.expiry_date || null,
          vet_check: formData.vet_check,
          vet_notes: formData.vet_notes || null,
          notes: formData.notes || null,
          security_zone_id: formData.security_zone_id || null,
          vet_sample_id: formData.vet_sample_id || null,
          vet_doctor_name: formData.vet_doctor_name || null,
          vet_result: formData.vet_result || null,
          game_type: formData.game_type || null,
          hunter_license_number: formData.hunter_license_number || null,
          judgement_number: formData.judgement_number || null,
          average_tusk_length: formData.average_tusk_length ? parseFloat(formData.average_tusk_length) : null,
          invoice_number: pricing.invoiceNumber || null,
          transport_price_per_kg: !isNaN(netTotal) && weightNum > 0 ? netTotal / weightNum : null,
          transport_vat_rate: !isNaN(vatVal) ? vatVal : null,
          transport_cooling_price: !isNaN(coolingPerKg) ? coolingPerKg : null,
          transport_cooling_vat_rate: !isNaN(coolingVatNum) ? coolingVatNum : null,
          usage_type: formData.usage_type || null,
          buyer_type: formData.buyer_type || null,
          buyer_name: formData.buyer_name || null,
          buyer_zip: formData.buyer_zip || null,
          buyer_city: formData.buyer_city || null,
          buyer_address: formData.buyer_address || null,
          buyer_tax_number: formData.buyer_tax_number || null,
        } as any)
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
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Állat szerkesztése</DialogTitle>
              <DialogDescription>
                Módosítsa az állat adatait
              </DialogDescription>
            </div>
            <AnimalHistoryDialog animalId={animal.id} animalIdentifier={animal.animal_id} />
          </div>
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
                onValueChange={(value) => setFormData({
                  ...formData,
                  species: value,
                  game_type: isBigGameSpecies(value) ? "" : (value ? SMALL_GAME_TYPE : ""),
                })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="🐏 Őz">🐏 Őz</SelectItem>
                  <SelectItem value="🦌 Dám Szarvas">🦌 Dám Szarvas</SelectItem>
                  <SelectItem value="🦌 Szika Szarvas">🦌 Szika Szarvas</SelectItem>
                  <SelectItem value="🦌 Gím Szarvas">🦌 Gím Szarvas</SelectItem>
                  <SelectItem value="🐗 Vaddisznó">🐗 Vaddisznó</SelectItem>
                  <SelectItem value="🐏 Muflon">🐏 Muflon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="game_type">Vad típus</Label>
              <Select
                value={formData.game_type}
                onValueChange={(value) => setFormData({ ...formData, game_type: value })}
                disabled={loading || !isBigGameSpecies(formData.species)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isBigGameSpecies(formData.species) ? "Válasszon típust" : (formData.game_type || "Apróvad")} />
                </SelectTrigger>
                <SelectContent>
                  {isBigGameSpecies(formData.species)
                    ? getGameTypesForSpecies(formData.species).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))
                    : <SelectItem value={SMALL_GAME_TYPE}>{SMALL_GAME_TYPE}</SelectItem>}
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

            <div className="col-span-2 rounded-lg border p-4 space-y-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Árazás és számlázás</h4>
                <span className="text-xs text-muted-foreground">Aktuális árlista alapján – felülírható</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="netPrice">Nettó ár (Ft)</Label>
                  <Input id="netPrice" type="number" step="0.01" value={pricing.netPrice}
                    onChange={(e) => handlePricingChange("netPrice", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceVat">ÁFA (%)</Label>
                  <Input id="priceVat" type="number" step="0.01" value={pricing.priceVat}
                    onChange={(e) => handlePricingChange("priceVat", e.target.value)} placeholder="27" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grossPrice">Bruttó ár (Ft)</Label>
                  <Input id="grossPrice" type="number" step="0.01" value={pricing.grossPrice}
                    onChange={(e) => handlePricingChange("grossPrice", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coolingPricePerKg">Hűtési díj (Ft/kg)</Label>
                  <Input id="coolingPricePerKg" type="number" step="0.01" value={pricing.coolingPricePerKg}
                    onChange={(e) => handlePricingChange("coolingPricePerKg", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coolingVat">Hűtési ÁFA (%)</Label>
                  <Input id="coolingVat" type="number" step="0.01" value={pricing.coolingVat}
                    onChange={(e) => handlePricingChange("coolingVat", e.target.value)} placeholder="27" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Számla sorszáma</Label>
                  <Input id="invoiceNumber" value={pricing.invoiceNumber}
                    onChange={(e) => handlePricingChange("invoiceNumber", e.target.value)} placeholder="pl. 2026/0123" />
                </div>
              </div>
              {(() => {
                const w = parseFloat(formData.weight) || 0;
                const gross = parseFloat(pricing.grossPrice) || 0;
                const cKg = parseFloat(pricing.coolingPricePerKg) || 0;
                const cVat = parseFloat(pricing.coolingVat) || 0;
                const total = gross + w * cKg * (1 + cVat / 100);
                if (!total) return null;
                return (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Össz érték (bruttó):</span>
                    <span className="text-lg font-bold text-primary">{Math.round(total).toLocaleString("hu-HU")} Ft</span>
                  </div>
                );
              })()}

              {/* Felhasználás és vásárló */}
              <div className="pt-4 border-t space-y-4">
                <h4 className="font-semibold text-sm">Felhasználás és vásárló</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="usage_type">Felhasználás típusa</Label>
                    <Select
                      value={formData.usage_type}
                      onValueChange={(value) => setFormData({ ...formData, usage_type: value })}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="sajat">Saját felhasználás</SelectItem>
                        <SelectItem value="ajandekozas">Ajándékozás</SelectItem>
                        <SelectItem value="barter">Barter</SelectItem>
                        <SelectItem value="eladas">Eladás</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.usage_type && formData.usage_type !== "sajat" && (
                    <div className="space-y-2">
                      <Label>Vásárló típusa</Label>
                      <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={formData.buyer_type === "private"}
                            onCheckedChange={(c) => setFormData({ ...formData, buyer_type: c ? "private" : "" })}
                          />
                          Magánszemély
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={formData.buyer_type === "company"}
                            onCheckedChange={(c) => setFormData({ ...formData, buyer_type: c ? "company" : "" })}
                          />
                          Vállalkozás
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                {formData.usage_type && formData.usage_type !== "sajat" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buyer_name">Vásárló neve</Label>
                        <Input
                          id="buyer_name"
                          value={formData.buyer_name}
                          onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                          placeholder="Vásárló neve"
                        />
                      </div>
                      {formData.buyer_type === "company" && (
                        <div className="space-y-2">
                          <Label htmlFor="buyer_tax_number">Vásárló adószáma</Label>
                          <Input
                            id="buyer_tax_number"
                            value={formData.buyer_tax_number}
                            onChange={(e) => setFormData({ ...formData, buyer_tax_number: e.target.value })}
                            placeholder="pl. 12345678-1-23"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Vásárló lakcíme</Label>
                      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-2">
                        <Input
                          value={formData.buyer_zip}
                          onChange={(e) => setFormData({ ...formData, buyer_zip: e.target.value })}
                          placeholder="Irányítószám"
                        />
                        <Input
                          value={formData.buyer_city}
                          onChange={(e) => setFormData({ ...formData, buyer_city: e.target.value })}
                          placeholder="Település"
                        />
                        <Input
                          value={formData.buyer_address}
                          onChange={(e) => setFormData({ ...formData, buyer_address: e.target.value })}
                          placeholder="Utca, házszám"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage_location_id">Hűtési helyszín</Label>
              <Select
                value={formData.storage_location_id}
                onValueChange={(value) => setFormData({ ...formData, storage_location_id: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="security_zone_id">Település - Beírókörzet</Label>
              <Select
                value={formData.security_zone_id}
                onValueChange={(value) => setFormData({ ...formData, security_zone_id: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon..." />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {securityZones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.settlements?.name ? `${zone.settlements.name} - ${zone.name}` : zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hunter_name">Vadász neve</Label>
              <Select
                value={isCustomHunter ? "custom" : formData.hunter_name}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setIsCustomHunter(true);
                    setFormData({ ...formData, hunter_name: "", hunter_type: "" });
                  } else {
                    setIsCustomHunter(false);
                    setFormData({ ...formData, hunter_name: value });
                    // Automatikusan állítsa be a vadász típust
                    const selectedHunter = hunters.find(h => h.contact_name === value);
                    if (selectedHunter?.hunter_category) {
                      setFormData(prev => ({ ...prev, hunter_type: getHunterCategoryDisplay(selectedHunter.hunter_category) }));
                    }
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon vadászt..." />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {hunters.map((hunter) => (
                    <SelectItem key={hunter.id} value={hunter.contact_name || ""}>
                      {hunter.contact_name} - {getHunterCategoryDisplay(hunter.hunter_category)}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Egyéb (kézi megadás)</SelectItem>
                </SelectContent>
              </Select>
              
              {isCustomHunter && (
                <Input
                  id="hunter_name_custom"
                  value={formData.hunter_name}
                  onChange={(e) => setFormData({ ...formData, hunter_name: e.target.value })}
                  disabled={loading}
                  placeholder="Adja meg a vadász nevét"
                  className="mt-2"
                />
              )}
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

            <div className="space-y-2 col-span-2">
              <Label>Elejtés időpontja</Label>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("flex-1 justify-start text-left font-normal", !formData.shooting_date && "text-muted-foreground")}
                      disabled={loading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.shooting_date
                        ? format(new Date(formData.shooting_date), "yyyy. MMMM d.", { locale: hu })
                        : <span>Válasszon dátumot</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.shooting_date ? new Date(formData.shooting_date) : undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        const base = formData.shooting_date ? new Date(formData.shooting_date) : new Date();
                        d.setHours(base.getHours() || 0, base.getMinutes() || 0, 0, 0);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        setFormData({ ...formData, shooting_date: iso });
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  className="w-32"
                  value={formData.shooting_date ? format(new Date(formData.shooting_date), "HH:mm") : ""}
                  onChange={(e) => {
                    const time = e.target.value;
                    if (!time) return;
                    const [h, m] = time.split(":").map(Number);
                    const base = formData.shooting_date ? new Date(formData.shooting_date) : new Date();
                    base.setHours(h, m, 0, 0);
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const iso = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
                    setFormData({ ...formData, shooting_date: iso });
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooling_date">Hűtőbe kerülési dátuma</Label>
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

            <div className="space-y-2">
              <Label htmlFor="hunter_license_number">Vadászjegyszám</Label>
              <Input
                id="hunter_license_number"
                value={formData.hunter_license_number}
                onChange={(e) => setFormData({ ...formData, hunter_license_number: e.target.value })}
                placeholder="pl. 12345/2024"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="judgement_number">Bírálati eredményközlő szám</Label>
              <Input
                id="judgement_number"
                value={formData.judgement_number}
                onChange={(e) => setFormData({ ...formData, judgement_number: e.target.value })}
                placeholder="pl. B-2024-001"
                disabled={loading}
              />
            </div>

            {formData.species === "🐗 Vaddisznó" && formData.gender === "♂️ Hím" && (
              <div className="space-y-2">
                <Label htmlFor="average_tusk_length">Átlag agyarhossz (cm)</Label>
                <Input
                  id="average_tusk_length"
                  type="number"
                  step="0.1"
                  value={formData.average_tusk_length}
                  onChange={(e) => setFormData({ ...formData, average_tusk_length: e.target.value })}
                  placeholder="pl. 15.5"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Állatorvosi vizsgálat</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vet_sample_id">Mintaközlő sorszáma</Label>
                <Input
                  id="vet_sample_id"
                  value={formData.vet_sample_id}
                  onChange={(e) => setFormData({ ...formData, vet_sample_id: e.target.value })}
                  disabled={loading}
                  placeholder="pl. MK-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vet_doctor_name">Eljáró állatorvos neve</Label>
                <Input
                  id="vet_doctor_name"
                  value={formData.vet_doctor_name}
                  onChange={(e) => setFormData({ ...formData, vet_doctor_name: e.target.value })}
                  disabled={loading}
                  placeholder="Dr. Kovács János"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vet_result">Vizsgálati eredmény</Label>
                <Select
                  value={formData.vet_result}
                  onValueChange={(value) => setFormData({ ...formData, vet_result: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="negatív">Negatív</SelectItem>
                    <SelectItem value="pozitív">Pozitív</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
