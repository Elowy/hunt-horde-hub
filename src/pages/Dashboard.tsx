import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Eye, Edit, Trash2, MapPin, LogOut, Star, Truck, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { TransporterDialog } from "@/components/TransporterDialog";
import { EditStorageLocationDialog } from "@/components/EditStorageLocationDialog";
import { ViewAnimalDialog } from "@/components/ViewAnimalDialog";
import { EditAnimalDialog } from "@/components/EditAnimalDialog";
import { CreateTransportDialog } from "@/components/CreateTransportDialog";
import jsPDF from "jspdf";

interface StorageLocation {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  is_default: boolean;
  notes: string | null;
}

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
  is_transported: boolean;
  transported_at: string | null;
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
  const [showTransportDialog, setShowTransportDialog] = useState(false);

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

  const handleDeleteAnimal = async (animal: Animal) => {
    const locationName = getLocationName(animal.storage_location_id);
    const confirmed = window.confirm(
      `Biztos törli a(z) ${locationName} helyszínről a(z) ${animal.animal_id} azonosítójú ${animal.species} vadfajú ${animal.weight || 0} kg súlyú vadat?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("animals")
        .delete()
        .eq("id", animal.id);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Állat törölve!",
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

  const handleDeleteLocation = async (locationId: string) => {
    // Check if there are animals at this location
    const animalsAtLocation = animals.filter(a => a.storage_location_id === locationId);
    
    if (animalsAtLocation.length > 0) {
      toast({
        title: "Hiba",
        description: `Nem törölhető a helyszín, mert ${animalsAtLocation.length} állat található ott!`,
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Biztosan törli ezt a helyszínt?")) return;

    try {
      const { error } = await supabase
        .from("storage_locations")
        .delete()
        .eq("id", locationId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Helyszín törölve!",
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

  const handleCreateTransport = () => {
    if (selectedAnimals.size === 0) {
      toast({
        title: "Figyelmeztetés",
        description: "Válasszon ki legalább egy állatot!",
        variant: "destructive",
      });
      return;
    }
    setShowTransportDialog(true);
  };

  const generateTransportPDF = async (transporterId: string) => {

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
      const transportDate = new Date().toISOString();
      
      const { data: transportDoc, error: docError } = await supabase
        .from("transport_documents")
        .insert({
          user_id: user.id,
          document_number: documentNumber,
          transport_date: transportDate,
          total_weight: totalWeight,
          total_price: totalPrice,
          animal_count: selectedAnimalsList.length,
          transporter_id: transporterId,
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

      // Állatok megjelölése elszállítottként
      const { error: updateError } = await supabase
        .from("animals")
        .update({ 
          is_transported: true,
          transported_at: transportDate
        })
        .in("id", Array.from(selectedAnimals));

      if (updateError) throw updateError;

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
        description: "Elszállító létrehozva és állatok elszállítva!",
      });
      
      setSelectedAnimals(new Set());
      fetchData(); // Refresh data to show updated transport status
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

  // Szétválasztás hűtött és elszállított állatokra
  const cooledAnimals = filteredAnimals.filter(animal => !animal.is_transported);
  const transportedAnimals = filteredAnimals.filter(animal => animal.is_transported);

  const getLocationName = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || "Ismeretlen";
  };

  const getLocationStats = (locationId: string) => {
    const locationAnimals = animals.filter(a => a.storage_location_id === locationId);
    
    // Calculate total price in HUF for animals at this location
    const totalPrice = locationAnimals.reduce((sum, animal) => {
      return sum + getAnimalPrice(animal);
    }, 0);
    
    const currentCount = locationAnimals.length;
    
    // Havi elszállított
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
            <div className="flex flex-wrap gap-2">
              <TransportDocumentsDialog />
              <TransporterDialog />
              <PriceSettingsDialog onPriceUpdated={fetchData} />
              <Button variant="outline" onClick={handleLogout} className="text-black border-black hover:bg-black/10">
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
                        <div className="flex items-center gap-1">
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
                          <EditStorageLocationDialog location={location} onLocationUpdated={fetchData} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
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

          {/* Táblázat - Tabs-okkal */}
          {animals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Még nincs állat a nyilvántartásban. Adjon hozzá egyet a kezdéshez!
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="cooled" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="cooled">
                  Jelenleg hűtött állatok ({cooledAnimals.length})
                </TabsTrigger>
                <TabsTrigger value="transported">
                  Már elszállított állatok ({transportedAnimals.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cooled">
                {/* Elszállító gomb */}
                {selectedAnimals.size > 0 && (
                  <div className="mb-4 flex justify-end">
                    <Button onClick={handleCreateTransport} variant="default">
                      <FileDown className="h-4 w-4 mr-2" />
                      Elszállító készítése ({selectedAnimals.size} állat)
                    </Button>
                  </div>
                )}
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
                      {cooledAnimals.map((animal) => {
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
                                <ViewAnimalDialog 
                                  animal={animal} 
                                  locationName={getLocationName(animal.storage_location_id)}
                                  price={price}
                                />
                                <EditAnimalDialog 
                                  animal={animal} 
                                  locations={locations}
                                  onAnimalUpdated={fetchData}
                                />
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteAnimal(animal)}
                                >
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
              </TabsContent>

              <TabsContent value="transported">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Azonosító</TableHead>
                        <TableHead>Faj</TableHead>
                        <TableHead>Súly (kg)</TableHead>
                        <TableHead>Osztály</TableHead>
                        <TableHead>Ár (Ft)</TableHead>
                        <TableHead>Vadász</TableHead>
                        <TableHead>Helyszín</TableHead>
                        <TableHead>Elszállítva</TableHead>
                        <TableHead className="text-right">Műveletek</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transportedAnimals.map((animal) => {
                        const price = getAnimalPrice(animal);
                        return (
                          <TableRow key={animal.id}>
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
                              {animal.transported_at
                                ? new Date(animal.transported_at).toLocaleDateString("hu-HU")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <ViewAnimalDialog 
                                  animal={animal} 
                                  locationName={getLocationName(animal.storage_location_id)}
                                  price={price}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
      
      <CreateTransportDialog
        open={showTransportDialog}
        onOpenChange={setShowTransportDialog}
        onTransporterSelected={generateTransportPDF}
      />
    </div>
  );
};

export default Dashboard;
