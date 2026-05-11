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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { FileText, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { getGameTypesForSpecies, isBigGameSpecies, SMALL_GAME_TYPE } from "@/lib/speciesConstants";

interface StorageLocation {
  id: string;
  name: string;
  is_default: boolean;
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
  shooting_fee: number;
  sampling_fee: number;
  price_per_unit: number;
  vat_rate: number;
  cooling_price_per_kg: number | null;
  affected_species: string[];
  is_active: boolean;
}

interface AddAnimalDialogProps {
  onAnimalAdded?: () => void;
}

export const AddAnimalDialog = ({ onAnimalAdded }: AddAnimalDialogProps) => {
  const { toast } = useToast();
  const { isPro, loading: subscriptionLoading, productId } = useSubscription();
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [securityZones, setSecurityZones] = useState<SecurityZone[]>([]);
  const [hunters, setHunters] = useState<Hunter[]>([]);
  const [isCustomHunter, setIsCustomHunter] = useState(false);
  const [manualHunterName, setManualHunterName] = useState(false);
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [epidemicMeasures, setEpidemicMeasures] = useState<EpidemicMeasure[]>([]);
  const [vatRate, setVatRate] = useState<number>(27);
  const [calculatedPrice, setCalculatedPrice] = useState<{ net: number; gross: number }>({ net: 0, gross: 0 });
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [skipCooling, setSkipCooling] = useState(false);

  // Pricing fields (auto-calculated, user-overridable)
  const [pricing, setPricing] = useState({
    netPrice: "",
    grossPrice: "",
    priceVat: "",
    coolingPricePerKg: "",
    coolingVat: "",
    invoiceNumber: "",
  });
  const [pricingTouched, setPricingTouched] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    animalId: "",
    storageLocationId: "",
    type: "",
    gender: "",
    class: "",
    gameType: "",
    weight: "",
    hunterType: "",
    hunterName: "",
    age: "",
    shootingDate: "",
    sampleId: "",
    vetCheck: "",
    notes: "",
    securityZoneId: "",
    vetSampleId: "",
    vetDoctorName: "",
    vetResult: "",
    averageTuskLength: "",
    judgementNumber: "",
    hunterLicenseNumber: "",
    usageType: "",
    buyerType: "",
    buyerName: "",
    buyerZip: "",
    buyerCity: "",
    buyerAddress: "",
    buyerTaxNumber: "",
  });

  useEffect(() => {
    if (open) {
      fetchLocations();
      fetchPriceSettings();
      fetchVatRate();
      fetchSecurityZones();
      fetchHunters();
      fetchEpidemicMeasures();
    }
  }, [open]);

  const fetchLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("storage_locations")
        .select("id, name, is_default")
        .order("name");

      if (error) throw error;
      
      const locationsList = data || [];
      setLocations(locationsList);

      const defaultLocation = locationsList.find(l => l.is_default);
      if (defaultLocation) {
        setFormData(prev => ({ ...prev, storageLocationId: defaultLocation.id }));
      }

      if (locationsList.length === 0) {
        toast({
          title: "Figyelmeztetés",
          description: "Először hozzon létre egy hűtési helyszínt a Dashboard-on!",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
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

  const calculatePrice = () => {
    if (!formData.type || !formData.class) {
      setCalculatedPrice({ net: 0, gross: 0 });
      return;
    }

    // Check for active epidemic measure
    const activeMeasure = epidemicMeasures.find(
      (m) => m.is_active && m.affected_species.includes(formData.type)
    );

    if (activeMeasure) {
      // For epidemic measures: shooting_fee + sampling_fee + price_per_unit
      const netPrice = activeMeasure.shooting_fee + activeMeasure.sampling_fee + activeMeasure.price_per_unit;
      const grossPrice = netPrice * (1 + (activeMeasure.vat_rate || 27) / 100);

      setCalculatedPrice({
        net: Math.round(netPrice),
        gross: Math.round(grossPrice),
      });
      return;
    }

    // Regular price calculation
    if (!formData.weight) {
      setCalculatedPrice({ net: 0, gross: 0 });
      return;
    }

    const weight = parseFloat(formData.weight);
    if (isNaN(weight)) {
      setCalculatedPrice({ net: 0, gross: 0 });
      return;
    }

    const priceSetting = priceSettings.find(
      (p) => p.species === formData.type && p.class === formData.class
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
  }, [formData.weight, formData.type, formData.class, priceSettings, vatRate, epidemicMeasures]);

  // Best-match cooling price lookup (mirrors handleSubmit logic)
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

  // Auto-fill pricing fields from current price list (skip fields user has touched)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const activeMeasure = epidemicMeasures.find(
        (m) => m.is_active && m.affected_species.includes(formData.type)
      );

      let netPerKg = 0;
      let vat = vatRate;
      let netTotal = 0;

      if (activeMeasure) {
        const total = activeMeasure.shooting_fee + activeMeasure.sampling_fee + activeMeasure.price_per_unit;
        netTotal = total;
        vat = activeMeasure.vat_rate || 27;
        if (formData.weight) netPerKg = total / parseFloat(formData.weight);
      } else if (formData.type && formData.class) {
        const ps = priceSettings.find((p) => p.species === formData.type && p.class === formData.class);
        if (ps) {
          netPerKg = ps.price_per_kg;
          if (formData.weight) netTotal = parseFloat(formData.weight) * ps.price_per_kg;
        }
      }

      // Cooling lookup
      let coolingPerKg = 0;
      let coolingVatVal = 0;
      if (skipCooling) {
        coolingPerKg = 0;
        coolingVatVal = 0;
      } else if (activeMeasure?.cooling_price_per_kg) {
        coolingPerKg = activeMeasure.cooling_price_per_kg;
        coolingVatVal = activeMeasure.vat_rate || 27;
      } else if (formData.storageLocationId) {
        const best = await fetchBestCoolingPrice(formData.storageLocationId, formData.type, formData.class);
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
        if (!pricingTouched.grossPrice) {
          const gross = netTotal * (1 + vat / 100);
          next.grossPrice = netTotal ? String(Math.round(gross)) : "";
        }
        if (!pricingTouched.coolingPricePerKg) next.coolingPricePerKg = coolingPerKg ? String(coolingPerKg) : "";
        if (!pricingTouched.coolingVat) next.coolingVat = coolingVatVal ? String(coolingVatVal) : "";
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.weight,
    formData.type,
    formData.class,
    formData.storageLocationId,
    priceSettings,
    vatRate,
    epidemicMeasures,
    skipCooling,
  ]);

  const handlePricingChange = (field: keyof typeof pricing, value: string) => {
    setPricing((prev) => {
      const next = { ...prev, [field]: value };
      // Cross-link net <-> gross via VAT
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === "type") {
        // Auto-fill / reset Vad típus based on species
        next.gameType = isBigGameSpecies(value) ? "" : (value ? SMALL_GAME_TYPE : "");
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.storageLocationId) {
      toast({
        title: "Hiba",
        description: "Kérjük, válasszon hűtési helyszínt!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Hiba",
          description: "Nincs bejelentkezve!",
          variant: "destructive",
        });
        return;
      }

      const PRO_PRODUCT_IDS = ["prod_SSUcjGG1Ju5Pwz", "prod_SSUdjbjzJmLc0t"];
      const NORMAL_PRODUCT_IDS = ["prod_TQMCKFFwVc6lXT", "prod_TQMCwp0XrDYkOB"];
      const isFreeUser = !productId || (!PRO_PRODUCT_IDS.includes(productId) && !NORMAL_PRODUCT_IDS.includes(productId) && productId !== "trial_pro");

      if (isFreeUser) {
        const { count, error: countError } = await supabase
          .from("animals")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (countError) throw countError;

        if (count && count >= 100) {
          toast({
            title: "Limit elérve",
            description: "Az ingyenes verzióban maximum 100 állat regisztrálható. Váltson Normal vagy Pro előfizetésre a korlátlan regisztrációhoz!",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Use user-edited / auto-calculated pricing values from state
      const weightNum = formData.weight ? parseFloat(formData.weight) : 0;
      const netTotal = parseFloat(pricing.netPrice);
      const vatVal = parseFloat(pricing.priceVat);
      const coolingPerKg = parseFloat(pricing.coolingPricePerKg);
      const coolingVatNum = parseFloat(pricing.coolingVat);

      const transportPrice = !isNaN(netTotal) && weightNum > 0 ? netTotal / weightNum : null;
      const transportVat = !isNaN(vatVal) ? vatVal : null;
      let coolingPrice: number | null = !isNaN(coolingPerKg) ? coolingPerKg : null;
      let coolingVat: number | null = !isNaN(coolingVatNum) ? coolingVatNum : null;

      if (skipCooling) {
        coolingPrice = 0;
        coolingVat = 0;
      }

      const { error } = await supabase.from("animals").insert({
        user_id: user.id,
        storage_location_id: formData.storageLocationId,
        animal_id: formData.animalId,
        species: formData.type,
        gender: formData.gender,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        class: formData.class,
        game_type: formData.gameType || null,
        hunter_type: formData.hunterType || null,
        hunter_name: formData.hunterName || null,
        age: formData.age || null,
        shooting_date: formData.shootingDate || null,
        sample_id: formData.sampleId || null,
        vet_check: formData.vetCheck === "yes",
        notes: formData.notes || null,
        security_zone_id: formData.securityZoneId || null,
        vet_sample_id: formData.vetSampleId || null,
        vet_doctor_name: formData.vetDoctorName || null,
        vet_result: formData.vetResult || null,
        average_tusk_length: formData.averageTuskLength ? parseFloat(formData.averageTuskLength) : null,
        judgement_number: formData.judgementNumber || null,
        hunter_license_number: formData.hunterLicenseNumber || null,
        cooling_date: new Date().toISOString(),
        reservation_status: formData.type === "Vaddisznó" ? "atev" : "available",
        transport_cooling_price: coolingPrice,
        transport_cooling_vat_rate: coolingVat,
        transport_price_per_kg: transportPrice,
        transport_vat_rate: transportVat,
        is_transported: skipCooling ? true : false,
        transported_at: skipCooling ? new Date().toISOString() : null,
        invoice_number: pricing.invoiceNumber || null,
        usage_type: formData.usageType || null,
        buyer_type: formData.buyerType || null,
        buyer_name: formData.buyerName || null,
        buyer_zip: formData.buyerZip || null,
        buyer_city: formData.buyerCity || null,
        buyer_address: formData.buyerAddress || null,
        buyer_tax_number: formData.buyerTaxNumber || null,
      } as any);

      if (error) throw error;

      toast({
        title: "Állat Sikeresen Hozzáadva",
        description: `${formData.type} (ID: ${formData.animalId}) hozzáadva a tárolóhoz.`,
      });
      
      // Reset form
      setFormData({
        animalId: "",
        storageLocationId: locations.find(l => l.is_default)?.id || "",
        type: "",
        gender: "",
        class: "",
        gameType: "",
        weight: "",
        hunterType: "",
        hunterName: "",
        age: "",
        shootingDate: "",
        sampleId: "",
        vetCheck: "",
        notes: "",
        securityZoneId: "",
        vetSampleId: "",
        vetDoctorName: "",
        vetResult: "",
        averageTuskLength: "",
        judgementNumber: "",
        hunterLicenseNumber: "",
        usageType: "",
        buyerType: "",
        buyerName: "",
        buyerZip: "",
        buyerCity: "",
        buyerAddress: "",
        buyerTaxNumber: "",
      });
      setSkipCooling(false);
      setPricing({ netPrice: "", grossPrice: "", priceVat: "", coolingPricePerKg: "", coolingVat: "", invoiceNumber: "" });
      setPricingTouched({});
      
      setOpen(false);
      if (onAnimalAdded) {
        onAnimalAdded();
      }
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
        <Button variant="default">
          <FileText className="mr-2 h-4 w-4" />
          Vad felvétele
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Új Állat Hozzáadása</DialogTitle>
          <DialogDescription>
            Adja meg az állat legfontosabb adatait
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="animalId">Vadazonosító *</Label>
              <Input
                id="animalId"
                value={formData.animalId}
                onChange={(e) => handleInputChange("animalId", e.target.value)}
                placeholder="Adja meg az egyedi állatazonosítót"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storageLocation">Hűtési helyszín *</Label>
              <Select 
                value={formData.storageLocationId} 
                onValueChange={(value) => handleInputChange("storageLocationId", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon helyszínt" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.is_default && "(Alapértelmezett)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Vadfaj *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange("type", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon vadfajt" />
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
              <Label htmlFor="gameType">Vad típus *</Label>
              <Select
                value={formData.gameType}
                onValueChange={(value) => handleInputChange("gameType", value)}
                disabled={!formData.type || !isBigGameSpecies(formData.type)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.type
                      ? "Először válasszon vadfajt"
                      : !isBigGameSpecies(formData.type)
                        ? SMALL_GAME_TYPE
                        : "Válasszon vad típust"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {isBigGameSpecies(formData.type)
                    ? getGameTypesForSpecies(formData.type).map((gt) => (
                        <SelectItem key={gt} value={gt}>{gt}</SelectItem>
                      ))
                    : <SelectItem value={SMALL_GAME_TYPE}>{SMALL_GAME_TYPE}</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Nem *</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(value) => handleInputChange("gender", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon nemet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hím">♂️ Hím</SelectItem>
                  <SelectItem value="Nőstény">♀️ Nőstény</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Osztály *</Label>
              <Select 
                value={formData.class} 
                onValueChange={(value) => handleInputChange("class", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon osztályt" />
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
              <Label htmlFor="weight">Súly (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder="pl. 85.5"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="shootingDate">Elejtés időpontja</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !formData.shootingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.shootingDate
                        ? format(new Date(formData.shootingDate), "yyyy. MMMM d.", { locale: hu })
                        : "Válasszon dátumot"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.shootingDate ? new Date(formData.shootingDate) : undefined}
                      onSelect={(date) => {
                        if (!date) return;
                        const existing = formData.shootingDate ? new Date(formData.shootingDate) : new Date();
                        date.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
                        // Local ISO without TZ shift: yyyy-MM-ddTHH:mm
                        const pad = (n: number) => String(n).padStart(2, "0");
                        const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                        handleInputChange("shootingDate", iso);
                      }}
                      initialFocus
                      locale={hu}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  className="w-32"
                  value={formData.shootingDate ? format(new Date(formData.shootingDate), "HH:mm") : ""}
                  onChange={(e) => {
                    const time = e.target.value;
                    if (!time) return;
                    const [h, m] = time.split(":").map(Number);
                    const base = formData.shootingDate ? new Date(formData.shootingDate) : new Date();
                    base.setHours(h, m, 0, 0);
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const iso = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
                    handleInputChange("shootingDate", iso);
                  }}
                />
              </div>
            </div>
          </div>

          {calculatedPrice.net > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Nettó ár:</span>
                <span className="text-lg font-bold">{calculatedPrice.net.toLocaleString("hu-HU")} Ft</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bruttó ár ({vatRate}% ÁFA):</span>
                <span className="text-lg font-bold text-primary">{calculatedPrice.gross.toLocaleString("hu-HU")} Ft</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
            <Checkbox
              id="skipCooling"
              checked={skipCooling}
              onCheckedChange={(checked) => setSkipCooling(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="skipCooling" className="cursor-pointer font-medium">
                Hűtési díj nélkül – azonnal elszállítva
              </Label>
              <p className="text-xs text-muted-foreground">
                Ha be van pipálva, nem számolunk hűtési díjat, és az állat automatikusan az elszállított állatok közé kerül.
              </p>
            </div>
          </div>

          <Collapsible open={showMore} onOpenChange={setShowMore}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full">
                {showMore ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Kevesebb adat
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    További adatok
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Árazás és számlázás */}
              <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Árazás és számlázás</h4>
                  <span className="text-xs text-muted-foreground">Aktuális árlista alapján – felülírható</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="netPrice">Nettó ár (Ft)</Label>
                    <Input
                      id="netPrice"
                      type="number"
                      step="0.01"
                      value={pricing.netPrice}
                      onChange={(e) => handlePricingChange("netPrice", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceVat">ÁFA (%)</Label>
                    <Input
                      id="priceVat"
                      type="number"
                      step="0.01"
                      value={pricing.priceVat}
                      onChange={(e) => handlePricingChange("priceVat", e.target.value)}
                      placeholder="27"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grossPrice">Bruttó ár (Ft)</Label>
                    <Input
                      id="grossPrice"
                      type="number"
                      step="0.01"
                      value={pricing.grossPrice}
                      onChange={(e) => handlePricingChange("grossPrice", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coolingPricePerKg">Hűtési díj (Ft/kg)</Label>
                    <Input
                      id="coolingPricePerKg"
                      type="number"
                      step="0.01"
                      value={pricing.coolingPricePerKg}
                      onChange={(e) => handlePricingChange("coolingPricePerKg", e.target.value)}
                      placeholder="0"
                      disabled={skipCooling}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coolingVat">Hűtési ÁFA (%)</Label>
                    <Input
                      id="coolingVat"
                      type="number"
                      step="0.01"
                      value={pricing.coolingVat}
                      onChange={(e) => handlePricingChange("coolingVat", e.target.value)}
                      placeholder="27"
                      disabled={skipCooling}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Számla sorszáma</Label>
                    <Input
                      id="invoiceNumber"
                      value={pricing.invoiceNumber}
                      onChange={(e) => handlePricingChange("invoiceNumber", e.target.value)}
                      placeholder="pl. 2026/0123"
                    />
                  </div>
                </div>
                {(() => {
                  const w = parseFloat(formData.weight) || 0;
                  const gross = parseFloat(pricing.grossPrice) || 0;
                  const cKg = parseFloat(pricing.coolingPricePerKg) || 0;
                  const cVat = parseFloat(pricing.coolingVat) || 0;
                  const coolingGross = w * cKg * (1 + cVat / 100);
                  const total = gross + coolingGross;
                  if (!total) return null;
                  return (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Össz érték (bruttó):</span>
                      <span className="text-lg font-bold text-primary">
                        {Math.round(total).toLocaleString("hu-HU")} Ft
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isPro && (
                  <div className="space-y-2">
                    <Label htmlFor="securityZone">Vadgazdálkodási egység</Label>
                    <Select 
                      value={formData.securityZoneId} 
                      onValueChange={(value) => handleInputChange("securityZoneId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon területet" />
                      </SelectTrigger>
                      <SelectContent>
                        {securityZones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.settlements?.name ? `${zone.settlements.name} - ${zone.name}` : zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="hunterType">Vadász típusa</Label>
                  <Select 
                    value={formData.hunterType} 
                    onValueChange={(value) => {
                      handleInputChange("hunterType", value);
                      setIsCustomHunter(false);
                      setManualHunterName(false);
                      handleInputChange("hunterName", "");
                      handleInputChange("hunterLicenseNumber", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon típust" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tag">Tag</SelectItem>
                      <SelectItem value="bervadasz">Bérvadász</SelectItem>
                      <SelectItem value="ib_vendeg">IB Vendég</SelectItem>
                      <SelectItem value="vendeg">Vendég</SelectItem>
                      <SelectItem value="egyeb">Egyéb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.hunterType && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hunterName">Vadász neve</Label>
                      {!isCustomHunter && manualHunterName && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setManualHunterName(false);
                            handleInputChange("hunterName", "");
                          }}
                        >
                          Lista
                        </Button>
                      )}
                    </div>
                    {isCustomHunter || manualHunterName ? (
                      <>
                        <Input
                          id="hunterName"
                          value={formData.hunterName}
                          onChange={(e) => handleInputChange("hunterName", e.target.value)}
                          placeholder="Adja meg a vadász nevét"
                        />
                        <Label htmlFor="hunterLicenseNumber" className="mt-2">Vadászjegyszám</Label>
                        <Input
                          id="hunterLicenseNumber"
                          value={formData.hunterLicenseNumber}
                          onChange={(e) => handleInputChange("hunterLicenseNumber", e.target.value)}
                          placeholder="pl. 12345/2024"
                        />
                      </>
                    ) : (
                      <Select 
                        value={formData.hunterName} 
                        onValueChange={(value) => {
                          if (value === "__manual__") {
                            setManualHunterName(true);
                            handleInputChange("hunterName", "");
                            return;
                          }
                          handleInputChange("hunterName", value);
                          const selectedHunter = hunters.find(h => h.contact_name === value);
                          if (selectedHunter?.hunter_category) {
                            handleInputChange("hunterType", selectedHunter.hunter_category);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Válasszon vadászt" />
                        </SelectTrigger>
                        <SelectContent>
                          {hunters
                            .filter(h => h.hunter_category === formData.hunterType && h.contact_name)
                            .map((hunter) => (
                              <SelectItem key={hunter.id} value={hunter.contact_name || ""}>
                                {hunter.contact_name} - {getHunterCategoryDisplay(hunter.hunter_category)}
                              </SelectItem>
                            ))}
                          <SelectItem value="__manual__">➕ Egyedi vadász megadása…</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {formData.type === "🐗 Vaddisznó" && (
                  <div className="space-y-2">
                    <Label htmlFor="age">Korcsop</Label>
                    <Select 
                      value={formData.age} 
                      onValueChange={(value) => handleInputChange("age", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon korcsoportot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fiatal">Fiatal</SelectItem>
                        <SelectItem value="Középkorú">Középkorú</SelectItem>
                        <SelectItem value="Öreg">Öreg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.type === "🐗 Vaddisznó" && (
                  <div className="space-y-2">
                    <Label htmlFor="sampleId">Mintaközlő szám</Label>
                    <Input
                      id="sampleId"
                      value={formData.sampleId}
                      onChange={(e) => handleInputChange("sampleId", e.target.value)}
                      placeholder="pl. M-2024-001"
                    />
                  </div>
                )}

                {["🐗 Vaddisznó", "🐏 Muflon", "🦌 Gím Szarvas", "🦌 Dám Szarvas", "🦌 Szika Szarvas", "🐏 Őz"].includes(formData.type) && formData.gender === "Hím" && (
                  <div className="space-y-2">
                    <Label htmlFor="judgementNumber">Bírálati eredményközlő szám</Label>
                    <Input
                      id="judgementNumber"
                      value={formData.judgementNumber}
                      onChange={(e) => handleInputChange("judgementNumber", e.target.value)}
                      placeholder="pl. B-2024-001"
                    />
                  </div>
                )}

                {formData.type === "🐗 Vaddisznó" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="vetSampleId">Állatorvosi mintaközlő szám</Label>
                      <Input
                        id="vetSampleId"
                        value={formData.vetSampleId}
                        onChange={(e) => handleInputChange("vetSampleId", e.target.value)}
                        placeholder="pl. V-2024-001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vetDoctorName">Eljáró állatorvos neve</Label>
                      <Input
                        id="vetDoctorName"
                        value={formData.vetDoctorName}
                        onChange={(e) => handleInputChange("vetDoctorName", e.target.value)}
                        placeholder="Dr. Kovács János"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vetResult">Vizsgálati eredmény</Label>
                      <Input
                        id="vetResult"
                        value={formData.vetResult}
                        onChange={(e) => handleInputChange("vetResult", e.target.value)}
                        placeholder="pl. Negatív"
                      />
                    </div>
                  </>
                )}

                {formData.type === "🐗 Vaddisznó" && formData.gender === "Hím" && (
                  <div className="space-y-2">
                    <Label htmlFor="averageTuskLength">Átlag agyarhossz (cm)</Label>
                    <Input
                      id="averageTuskLength"
                      type="number"
                      step="0.1"
                      value={formData.averageTuskLength}
                      onChange={(e) => handleInputChange("averageTuskLength", e.target.value)}
                      placeholder="pl. 15.5"
                    />
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Megjegyzések</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Ide írhat bármilyen további információt"
                    rows={3}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mentés..." : "Hozzáadás"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
