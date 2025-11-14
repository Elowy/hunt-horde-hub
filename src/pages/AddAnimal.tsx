import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StorageLocation {
  id: string;
  name: string;
  is_default: boolean;
}

const AddAnimal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    animalId: "",
    storageLocationId: "",
    type: "",
    gender: "",
    class: "",
    weight: "",
  });

  useEffect(() => {
    checkAuth();
    fetchLocations();
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

      // Auto-select default location
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

      const { error } = await supabase.from("animals").insert({
        user_id: user.id,
        storage_location_id: formData.storageLocationId,
        animal_id: formData.animalId,
        species: formData.type,
        gender: formData.gender,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        class: formData.class,
        cooling_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Állat Sikeresen Hozzáadva",
        description: `${formData.type} (ID: ${formData.animalId}) hozzáadva a tárolóhoz.`,
      });
      
      // Navigate back to dashboard
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
    <div className="min-h-screen bg-gradient-to-br from-hunt-dark via-hunt-primary to-hunt-secondary">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Vissza az Irányítópulthoz
          </Button>
          <h1 className="text-3xl font-bold text-white">Új Állat Hozzáadása</h1>
        </div>

        <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-hunt-dark">
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
                  <Label htmlFor="type">Állat Típusa *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon állattípust" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vaddisznó">Vaddisznó</SelectItem>
                      <SelectItem value="Gím Szarvas">Gím Szarvas</SelectItem>
                      <SelectItem value="Dám Szarvas">Dám Szarvas</SelectItem>
                      <SelectItem value="Őz">Őz</SelectItem>
                      <SelectItem value="Muflon">Muflon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Nem</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon nemet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hím">Hím</SelectItem>
                      <SelectItem value="Nőstény">Nőstény</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Osztály</Label>
                  <Select value={formData.class} onValueChange={(value) => handleInputChange("class", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon osztályt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1. osztály">1. osztály</SelectItem>
                      <SelectItem value="2. osztály">2. osztály</SelectItem>
                      <SelectItem value="3. osztály">3. osztály</SelectItem>
                      <SelectItem value="Kobzott">Kobzott</SelectItem>
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
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    placeholder="pl. 85.5"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1" variant="hunting" disabled={loading || locations.length === 0}>
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
