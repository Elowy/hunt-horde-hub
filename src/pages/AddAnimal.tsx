import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
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
}

interface PriceSetting {
  species: string;
  class: string;
  price_per_kg: number;
}

const AddAnimal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro, loading: subscriptionLoading, productId } = useSubscription();
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
    checkAuth();
    fetchLocations();
    fetchPriceSettings();
    fetchVatRate();
    fetchSecurityZones();
    fetchHunters();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
    }
  };

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
        .select("id, contact_name")
        .in("id", hunterIds)
        .not("contact_name", "is", null);

      if (profilesError) throw profilesError;
      setHunters(profiles || []);
    } catch (error: any) {
      console.error("Error fetching hunters:", error);
    }
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

      // Ellenőrizzük az ingyenes felhasználók állat limitjét
      const PRO_PRODUCT_IDS = ["prod_TQMCsYuGXl2cqX", "prod_TQMCzW95I3TlPz"];
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
      
      setTimeout(() => navigate("/dashboard"), 1500);
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
    <div className="min-h-screen bg-gradient-to-br from-forest-deep via-primary to-forest-light">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-primary-foreground hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Vissza az Irányítópulthoz
          </Button>
          <h1 className="text-3xl font-bold text-primary-foreground">Új Állat Hozzáadása</h1>
        </div>

        <Card className="max-w-2xl mx-auto bg-card/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <PlusCircle className="w-6 h-6 mr-2" />
              Alapvető Állat Információk
            </CardTitle>
            <CardDescription>
              Adja meg az állat legfontosabb adatait
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <Label htmlFor="storageLocationId">Hűtési Helyszín *</Label>
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
                    <span className="text-sm text-muted-foreground">Bruttó ár (ÁFA {vatRate}%):</span>
                    <span className="text-lg">{calculatedPrice.gross.toLocaleString("hu-HU")} Ft</span>
                  </div>
                </div>
              )}

              <Collapsible open={showMore} onOpenChange={setShowMore}>
                <CollapsibleTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full flex items-center justify-between"
                  >
                    <span>További információk (opcionális)</span>
                    {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hunterType">Vadász Típusa</Label>
                      <Select 
                        value={formData.hunterType} 
                        onValueChange={(value) => handleInputChange("hunterType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Válasszon típust" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Vadőr">Vadőr</SelectItem>
                          <SelectItem value="Tag">Tag</SelectItem>
                          <SelectItem value="Bérvadász">Bérvadász</SelectItem>
                          <SelectItem value="IB vendég">IB vendég</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hunterName">Vadász Neve</Label>
                      <Select 
                        value={isCustomHunter ? "custom" : formData.hunterName} 
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setIsCustomHunter(true);
                            handleInputChange("hunterName", "");
                          } else {
                            setIsCustomHunter(false);
                            handleInputChange("hunterName", value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Válasszon vadászt..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {hunters.map((hunter) => (
                            <SelectItem key={hunter.id} value={hunter.contact_name || ""}>
                              {hunter.contact_name}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Egyéb (kézi megadás)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {isCustomHunter && (
                        <Input
                          id="hunterNameCustom"
                          value={formData.hunterName}
                          onChange={(e) => handleInputChange("hunterName", e.target.value)}
                          placeholder="Adja meg a vadász nevét"
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age">
                        {formData.type === "Vaddisznó" ? "Életkor (hónapban)" : "Életkor (évben)"}
                      </Label>
                      <Input
                        id="age"
                        value={formData.age}
                        onChange={(e) => handleInputChange("age", e.target.value)}
                        placeholder={formData.type === "Vaddisznó" ? "pl. 6 hónap" : "pl. 3 év"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sampleId">Minta ID (Vaddisznó)</Label>
                      <Input
                        id="sampleId"
                        value={formData.sampleId}
                        onChange={(e) => handleInputChange("sampleId", e.target.value)}
                        placeholder="pl. M-2024-001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="securityZoneId">Település - Beírókörzet</Label>
                      <Select 
                        value={formData.securityZoneId} 
                        onValueChange={(value) => handleInputChange("securityZoneId", value)}
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
                      <Label htmlFor="judgementNumber">Bírálati eredményközlő szám</Label>
                      <Input
                        id="judgementNumber"
                        value={formData.judgementNumber}
                        onChange={(e) => handleInputChange("judgementNumber", e.target.value)}
                        placeholder="pl. BK-2024-001"
                      />
                    </div>

                    {formData.type === "🐗 Vaddisznó" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="vetSampleId">Állatorvosi mintaközlő</Label>
                          <Input
                            id="vetSampleId"
                            value={formData.vetSampleId}
                            onChange={(e) => handleInputChange("vetSampleId", e.target.value)}
                            placeholder="pl. MK-2024-001"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="vetDoctorName">Eljáró állatorvos</Label>
                          <Input
                            id="vetDoctorName"
                            value={formData.vetDoctorName}
                            onChange={(e) => handleInputChange("vetDoctorName", e.target.value)}
                            placeholder="Dr. Kovács János"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="vetResult">Vizsgálati eredmény</Label>
                          <Select 
                            value={formData.vetResult} 
                            onValueChange={(value) => handleInputChange("vetResult", value)}
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
                          placeholder="pl. 12.5"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Jegyzetek</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="További megjegyzések az állatról..."
                      rows={3}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  variant="hunting" 
                  disabled={loading || locations.length === 0}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {loading ? "Mentés..." : "Állat Hozzáadása"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                  disabled={loading}
                >
                  Mégse
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddAnimal;
