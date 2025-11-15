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
import { useToast } from "@/hooks/use-toast";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

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
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [vatRate, setVatRate] = useState<number>(27);
  const [calculatedPrice, setCalculatedPrice] = useState<{ net: number; gross: number }>({ net: 0, gross: 0 });
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  
  const [formData, setFormData] = useState({
    animalId: "",
    storageLocationId: "",
    type: "",
    gender: "",
    class: "",
    weight: "",
    hunterType: "",
    hunterName: "",
    age: "",
    sampleId: "",
    vetCheck: "",
    notes: "",
    securityZoneId: "",
    vetSampleId: "",
    vetDoctorName: "",
    vetResult: "",
    averageTuskLength: "",
    judgementNumber: "",
  });

  useEffect(() => {
    if (open) {
      fetchLocations();
      fetchPriceSettings();
      fetchVatRate();
      fetchSecurityZones();
      fetchHunters();
    }
  }, [open]);

  const fetchLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("storage_locations")
        .select("id, name, is_default")
        .eq("user_id", user.id)
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
    if (!formData.weight || !formData.type || !formData.class) {
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
  }, [formData.weight, formData.type, formData.class, priceSettings, vatRate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      const { error } = await supabase.from("animals").insert({
        user_id: user.id,
        storage_location_id: formData.storageLocationId,
        animal_id: formData.animalId,
        species: formData.type,
        gender: formData.gender,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        class: formData.class,
        hunter_type: formData.hunterType || null,
        hunter_name: formData.hunterName || null,
        age: formData.age || null,
        sample_id: formData.sampleId || null,
        vet_check: formData.vetCheck === "yes",
        notes: formData.notes || null,
        security_zone_id: formData.securityZoneId || null,
        vet_sample_id: formData.vetSampleId || null,
        vet_doctor_name: formData.vetDoctorName || null,
        vet_result: formData.vetResult || null,
        average_tusk_length: formData.averageTuskLength ? parseFloat(formData.averageTuskLength) : null,
        judgement_number: formData.judgementNumber || null,
        cooling_date: new Date().toISOString(),
      });

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
        weight: "",
        hunterType: "",
        hunterName: "",
        age: "",
        sampleId: "",
        vetCheck: "",
        notes: "",
        securityZoneId: "",
        vetSampleId: "",
        vetDoctorName: "",
        vetResult: "",
        averageTuskLength: "",
        judgementNumber: "",
      });
      
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
        <Button variant="ghost" className="w-full justify-start">
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
                  <SelectItem value="🐗 Vaddisznó">🐗 Vaddisznó</SelectItem>
                  <SelectItem value="🦌 Szarvas">🦌 Szarvas</SelectItem>
                  <SelectItem value="🐏 Őz">🐏 Őz</SelectItem>
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
                      setIsCustomHunter(value === "egyéb");
                      if (value !== "egyéb") {
                        handleInputChange("hunterName", "");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon típust" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tag">Tag</SelectItem>
                      <SelectItem value="vendeg">Vendég</SelectItem>
                      <SelectItem value="berlovesz">Bérlövész</SelectItem>
                      <SelectItem value="egyeb">Egyéb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.hunterType && (
                  <div className="space-y-2">
                    <Label htmlFor="hunterName">Vadász neve</Label>
                    {isCustomHunter ? (
                      <Input
                        id="hunterName"
                        value={formData.hunterName}
                        onChange={(e) => handleInputChange("hunterName", e.target.value)}
                        placeholder="Adja meg a vadász nevét"
                      />
                    ) : (
                      <Select 
                        value={formData.hunterName} 
                        onValueChange={(value) => {
                          handleInputChange("hunterName", value);
                          // Automatikusan állítsuk be a vadász típust
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
                          {hunters.map((hunter) => (
                            <SelectItem key={hunter.id} value={hunter.contact_name || ""}>
                              {hunter.contact_name} - {getHunterCategoryDisplay(hunter.hunter_category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

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

                <div className="space-y-2">
                  <Label htmlFor="sampleId">Mintaközlő szám</Label>
                  <Input
                    id="sampleId"
                    value={formData.sampleId}
                    onChange={(e) => handleInputChange("sampleId", e.target.value)}
                    placeholder="pl. M-2024-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="judgementNumber">Bírálati eredményközlő szám</Label>
                  <Input
                    id="judgementNumber"
                    value={formData.judgementNumber}
                    onChange={(e) => handleInputChange("judgementNumber", e.target.value)}
                    placeholder="pl. B-2024-001"
                  />
                </div>

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
