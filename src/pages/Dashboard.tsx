import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Eye, Edit, Trash2, MapPin, LogOut, Star, Truck, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StorageLocationDialog } from "@/components/StorageLocationDialog";
import { PriceSettingsDialog } from "@/components/PriceSettingsDialog";
import { TransportDocumentsDialog } from "@/components/TransportDocumentsDialog";
import jsPDF from "jspdf";

interface StorageLocation {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  is_default: boolean;
}

interface Animal {
  id: string;
  animal_id: string;
  species: string;
  weight: number | null;
  cooling_date: string | null;
  storage_location_id: string;
  hunter_name: string | null;
  class: string | null;
}

interface PriceSetting {
  id: string;
  species: string;
  class: string;
  price_per_kg: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [locationsResult, animalsResult, pricesResult] = await Promise.all([
        supabase
          .from("storage_locations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("animals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("price_settings")
          .select("*")
          .eq("user_id", user.id),
      ]);

      if (locationsResult.error) throw locationsResult.error;
      if (animalsResult.error) throw animalsResult.error;
      if (pricesResult.error) throw pricesResult.error;

      setLocations(locationsResult.data || []);
      setAnimals(animalsResult.data || []);
      setPriceSettings(pricesResult.data || []);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSetDefaultLocation = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from("storage_locations")
        .update({ is_default: true })
        .eq("id", locationId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Alapértelmezett helyszín beállítva!",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleAnimalSelection = (animalId: string) => {
    const newSelected = new Set(selectedAnimals);
    if (newSelected.has(animalId)) {
      newSelected.delete(animalId);
    } else {
      newSelected.add(animalId);
    }
    setSelectedAnimals(newSelected);
  };

  const getAnimalPrice = (animal: Animal) => {
    if (!animal.weight || !animal.species || !animal.class) return 0;
    
    const priceSetting = priceSettings.find(
      (p) => p.species === animal.species && p.class === animal.class
    );
    
    if (!priceSetting) return 0;
    
    return animal.weight * priceSetting.price_per_kg;
  };

  const generateTransportPDF = async () => {
    if (selectedAnimals.size === 0) {
      toast({
        title: "Figyelmeztetés",
        description: "Válasszon ki legalább egy állatot!",
        variant: "destructive",
      });
      return;
    }

    const selectedAnimalsList = animals.filter(a => selectedAnimals.has(a.id));
    
    // Számítások
    let totalWeight = 0;
    let totalPrice = 0;
    
    selectedAnimalsList.forEach((animal) => {
      const price = getAnimalPrice(animal);
      totalWeight += animal.weight || 0;
      totalPrice += price;
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Elszállító mentése az adatbázisba
      const documentNumber = `ESZ-${Date.now()}`;
      
      const { data: transportDoc, error: docError } = await supabase
        .from("transport_documents")
        .insert({
          user_id: user.id,
          document_number: documentNumber,
          transport_date: new Date().toISOString(),
          total_weight: totalWeight,
          total_price: totalPrice,
          animal_count: selectedAnimalsList.length,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Tételek mentése
      const items = selectedAnimalsList.map(animal => ({
        transport_document_id: transportDoc.id,
        animal_id: animal.id,
      }));

      const { error: itemsError } = await supabase
        .from("transport_document_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // PDF generálás
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text("Elszallito", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Bizonylat szam: ${documentNumber}`, 20, 35);
      doc.text(`Datum: ${new Date().toLocaleDateString("hu-HU")}`, 20, 45);
      
      let yPos = 60;
      doc.setFontSize(10);
      doc.text("Azonosito", 20, yPos);
      doc.text("Faj", 60, yPos);
      doc.text("Osztaly", 90, yPos);
      doc.text("Suly (kg)", 120, yPos);
      doc.text("Ar (Ft)", 160, yPos);
      
      yPos += 10;
      
      selectedAnimalsList.forEach((animal) => {
        const price = getAnimalPrice(animal);
        
        doc.text(animal.animal_id, 20, yPos);
        doc.text(animal.species, 60, yPos);
        doc.text(animal.class || "-", 90, yPos);
        doc.text((animal.weight || 0).toString(), 120, yPos);
        doc.text(Math.round(price).toLocaleString("hu-HU"), 160, yPos);
        
        yPos += 8;
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      yPos += 10;
      doc.setFontSize(12);
      doc.text(`Osszes suly: ${totalWeight.toFixed(2)} kg`, 20, yPos);
      doc.text(`Osszes ar: ${Math.round(totalPrice).toLocaleString("hu-HU")} Ft`, 20, yPos + 10);
      
      doc.save(`elszallito_${documentNumber}.pdf`);
      
      toast({
        title: "Siker!",
        description: "Elszállító létrehozva és mentve!",
      });
      
      setSelectedAnimals(new Set());
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = 
      animal.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.animal_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterLocation === "all" || animal.storage_location_id === filterLocation;
    
    return matchesSearch && matchesFilter;
  });

  const getLocationName = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || "Ismeretlen";
  };

  const getLocationStats = (locationId: string) => {
    const locationAnimals = animals.filter(a => a.storage_location_id === locationId);
    
    // Calculate total price in HUF
    const totalPrice = locationAnimals.reduce((sum, animal) => {
      return sum + getAnimalPrice(animal);
    }, 0);
    
    const currentCount = locationAnimals.length;
    
    // Havi elszállított - az aktuális hónapban hozzáadott állatok
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyShipped = locationAnimals.filter(a => {
      if (!a.cooling_date) return false;
      const date = new Date(a.cooling_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    return {
      totalPrice: Math.round(totalPrice),
      currentCount,
      monthlyShipped,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-forest-deep to-forest-light text-white py-8">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Állat Nyilvántartó</h1>
              <p className="text-primary-foreground/90">Vadászati nyilvántartás és hűtés kezelése</p>
            </div>
            <div className="flex gap-2">
              <TransportDocumentsDialog />
              <PriceSettingsDialog onPriceUpdated={fetchData} />
              <Button variant="outline" onClick={handleLogout} className="text-white border-white hover:bg-white/10">
                <LogOut className="h-4 w-4 mr-2" />
                Kijelentkezés
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Hűtési helyszínek */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-forest-deep">Hűtési helyszínek</h2>
            <StorageLocationDialog onLocationAdded={fetchData} />
          </div>
          
          {locations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Még nincs hűtési helyszín. Adjon hozzá egyet a kezdéshez!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {locations.map((location) => {
                const stats = getLocationStats(location.id);
                return (
                  <Card key={location.id} className={location.is_default ? "border-hunt-orange border-2" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-hunt-orange" />
                          <CardTitle className="text-lg">{location.name}</CardTitle>
                          {location.is_default && (
                            <Badge variant="outline" className="text-hunt-orange border-hunt-orange">
                              Alapértelmezett
                            </Badge>
                          )}
                        </div>
                        {!location.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultLocation(location.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Star className="h-4 w-4 text-muted-foreground hover:text-hunt-orange" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {location.address && (
                        <p className="text-sm text-muted-foreground">{location.address}</p>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Teljes hűtési érték:</span>
                        <span className="font-semibold">{stats.totalPrice.toLocaleString("hu-HU")} Ft</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Jelenlegi bentlévő:</span>
                        <span className="font-semibold">{stats.currentCount} db</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Havi elszállított:</span>
                        <span className="font-semibold">{stats.monthlyShipped} db</span>
                      </div>
                      {location.capacity && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Kapacitás:</span>
                          <span className="font-semibold">{location.capacity} db</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Összes állat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{animals.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Helyszínek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                🦌 Szarvas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {animals.filter(a => a.species === "🦌 Szarvas").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                🐗 Vaddisznó
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {animals.filter(a => a.species === "🐗 Vaddisznó").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Állat nyilvántartás */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-forest-deep">Állat nyilvántartás</h2>
            <Button onClick={() => navigate("/add-animal")}>
              <Plus className="h-4 w-4 mr-2" />
              Állat hozzáadása
            </Button>
          </div>

          {/* Keresés és szűrés */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Keresés azonosító vagy faj alapján..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Helyszín szűrés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Minden helyszín</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Elszállító gomb */}
          {selectedAnimals.size > 0 && (
            <div className="mb-4 flex justify-end">
              <Button onClick={generateTransportPDF} variant="default">
                <FileDown className="h-4 w-4 mr-2" />
                Elszállító készítése ({selectedAnimals.size} állat)
              </Button>
            </div>
          )}

          {/* Táblázat */}
          {animals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Még nincs állat a nyilvántartásban. Adjon hozzá egyet a kezdéshez!
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Truck className="h-4 w-4" />
                    </TableHead>
                    <TableHead>Azonosító</TableHead>
                    <TableHead>Faj</TableHead>
                    <TableHead>Súly (kg)</TableHead>
                    <TableHead>Osztály</TableHead>
                    <TableHead>Ár (Ft)</TableHead>
                    <TableHead>Vadász</TableHead>
                    <TableHead>Helyszín</TableHead>
                    <TableHead>Dátum</TableHead>
                    <TableHead className="text-right">Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnimals.map((animal) => {
                    const price = getAnimalPrice(animal);
                    return (
                      <TableRow key={animal.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedAnimals.has(animal.id)}
                            onCheckedChange={() => toggleAnimalSelection(animal.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{animal.animal_id}</TableCell>
                        <TableCell>{animal.species}</TableCell>
                        <TableCell>{animal.weight || "-"}</TableCell>
                        <TableCell>{animal.class || "-"}</TableCell>
                        <TableCell className="font-semibold">
                          {price > 0 ? Math.round(price).toLocaleString("hu-HU") : "-"}
                        </TableCell>
                        <TableCell>{animal.hunter_name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getLocationName(animal.storage_location_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {animal.cooling_date
                            ? new Date(animal.cooling_date).toLocaleDateString("hu-HU")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
