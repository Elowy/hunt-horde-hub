import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Eye, Edit, Trash2, MapPin, LogOut, Star, Truck, FileDown, TrendingUp, User, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { DashboardMenu } from "@/components/DashboardMenu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

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
  transporter_name?: string;
}

interface TransportDocument {
  id: string;
  transporter_id: string | null;
  transporters?: {
    company_name: string;
  };
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
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterVetCheck, setFilterVetCheck] = useState("all");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [vatRate, setVatRate] = useState<number>(27);
  const [loading, setLoading] = useState(true);
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [showTransportDialog, setShowTransportDialog] = useState(false);
  const [transportDocuments, setTransportDocuments] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!roles);
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [locationsResult, animalsResult, pricesResult, transportDocsResult, profileResult] = await Promise.all([
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
        supabase
          .from("transport_documents")
          .select(`
            id,
            transporter_id,
            transporters (
              company_name
            )
          `)
          .eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("vat_rate")
          .eq("id", user.id)
          .single(),
      ]);

      if (locationsResult.error) throw locationsResult.error;
      if (animalsResult.error) throw animalsResult.error;
      if (pricesResult.error) throw pricesResult.error;
      if (profileResult.data?.vat_rate) {
        setVatRate(profileResult.data.vat_rate);
      }

      setLocations(locationsResult.data || []);
      setAnimals(animalsResult.data || []);
      setPriceSettings(pricesResult.data || []);

      // Build map of animal_id -> transporter_name
      const transportMap: Record<string, string> = {};
      
      if (transportDocsResult.data) {
        // Get all transport document items to map animals to transporters
        const { data: itemsData } = await supabase
          .from("transport_document_items")
          .select("animal_id, transport_document_id");
        
        if (itemsData) {
          itemsData.forEach((item) => {
            const doc = transportDocsResult.data?.find((d: any) => d.id === item.transport_document_id);
            if (doc?.transporters?.company_name) {
              transportMap[item.animal_id] = doc.transporters.company_name;
            }
          });
        }
      }
      
      setTransportDocuments(transportMap);
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

  const exportSelectedToExcel = () => {
    if (selectedAnimals.size === 0) {
      toast({
        title: "Nincs kiválasztott állat",
        description: "Kérjük, válasszon ki legalább egy állatot az exportáláshoz.",
        variant: "destructive",
      });
      return;
    }

    const selectedData = animals.filter(animal => selectedAnimals.has(animal.id));
    
    const excelData = selectedData.map(animal => ({
      "Állat ID": animal.animal_id,
      "Faj": animal.species,
      "Nem": animal.gender || "-",
      "Osztály": animal.class || "-",
      "Súly (kg)": animal.weight || 0,
      "Kor": animal.age || "-",
      "Állapot": animal.condition || "-",
      "Vadász neve": animal.hunter_name || "-",
      "Vadász típus": animal.hunter_type || "-",
      "Hűtési hely": getLocationName(animal.storage_location_id),
      "Hűtés dátuma": animal.cooling_date ? new Date(animal.cooling_date).toLocaleDateString('hu-HU') : "-",
      "Lejárati dátum": animal.expiry_date ? new Date(animal.expiry_date).toLocaleDateString('hu-HU') : "-",
      "Állatorvosi ellenőrzés": animal.vet_check ? "Igen" : "Nem",
      "Minta ID": animal.sample_id || "-",
      "Mintavétel dátuma": animal.sample_date ? new Date(animal.sample_date).toLocaleDateString('hu-HU') : "-",
      "Megjegyzések": animal.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kiválasztott állatok");

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(
        maxWidth,
        Math.max(
          key.length,
          ...excelData.map(row => String(row[key as keyof typeof row]).length)
        )
      )
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `allatok_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Sikeres exportálás",
      description: `${selectedAnimals.size} állat exportálva Excel fájlba.`,
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterLocation("all");
    setFilterSpecies("all");
    setFilterClass("all");
    setFilterGender("all");
    setFilterVetCheck("all");
  };

  const uniqueSpecies = Array.from(new Set(animals.map(a => a.species))).filter(Boolean);
  const uniqueClasses = Array.from(new Set(animals.map(a => a.class))).filter(Boolean);
  const uniqueGenders = Array.from(new Set(animals.map(a => a.gender))).filter(Boolean);

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

  const getAnimalPrice = (animal: Animal): { net: number; gross: number } => {
    if (!animal.weight || !animal.species || !animal.class) return { net: 0, gross: 0 };
    
    const priceSetting = priceSettings.find(
      (p) => p.species === animal.species && p.class === animal.class
    );
    
    if (!priceSetting) return { net: 0, gross: 0 };
    
    const netPrice = animal.weight * priceSetting.price_per_kg;
    const grossPrice = netPrice * (1 + vatRate / 100);
    
    return { 
      net: Math.round(netPrice), 
      gross: Math.round(grossPrice) 
    };
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

  const generateTransportPDF = async (transporterId: string, vehiclePlate: string) => {

    const selectedAnimalsList = animals.filter(a => selectedAnimals.has(a.id));
    
    // Számítások
    let totalWeight = 0;
    let totalPrice = 0;
    
    selectedAnimalsList.forEach((animal) => {
      const price = getAnimalPrice(animal);
      totalWeight += animal.weight || 0;
      totalPrice += price.gross;
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Elszállító adatainak lekérése
      const { data: transporterData, error: transporterError } = await supabase
        .from("transporters")
        .select("*")
        .eq("id", transporterId)
        .single();

      if (transporterError) throw transporterError;

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
          vehicle_plate: vehiclePlate,
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
      doc.text(`Datum: ${new Date().toLocaleDateString("hu-HU")}`, 20, 42);
      
      // Elszállító adatok
      doc.setFontSize(10);
      doc.text("ELSZALLITO ADATAI:", 20, 52);
      doc.text(`Ceg neve: ${transporterData.company_name}`, 20, 59);
      if (transporterData.contact_name) {
        doc.text(`Kapcsolattarto: ${transporterData.contact_name}`, 20, 66);
      }
      if (transporterData.address) {
        doc.text(`Cim: ${transporterData.address}`, 20, 73);
      }
      if (transporterData.tax_number) {
        doc.text(`Adoszam: ${transporterData.tax_number}`, 20, 80);
      }
      doc.text(`Gepjarmu rendszama: ${vehiclePlate}`, 20, 87);
      
      let yPos = 100;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("Azonosito", 20, yPos);
      doc.text("Faj", 60, yPos);
      doc.text("Osztaly", 90, yPos);
      doc.text("Suly (kg)", 120, yPos);
      doc.text("Ar (Ft)", 160, yPos);
      doc.setFont(undefined, 'normal');
      
      yPos += 10;
      
      selectedAnimalsList.forEach((animal) => {
        const price = getAnimalPrice(animal);
        
        doc.text(animal.animal_id, 20, yPos);
        doc.text(animal.species, 60, yPos);
        doc.text(animal.class || "-", 90, yPos);
        doc.text((animal.weight || 0).toString(), 120, yPos);
        doc.text(price.gross.toLocaleString("hu-HU"), 160, yPos);
        
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
      animal.animal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (animal.hunter_name && animal.hunter_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = 
      filterLocation === "all" || animal.storage_location_id === filterLocation;
    const matchesSpecies = 
      filterSpecies === "all" || animal.species === filterSpecies;
    const matchesClass = 
      filterClass === "all" || animal.class === filterClass;
    const matchesGender = 
      filterGender === "all" || animal.gender === filterGender;
    const matchesVetCheck = 
      filterVetCheck === "all" || 
      (filterVetCheck === "checked" && animal.vet_check) ||
      (filterVetCheck === "unchecked" && !animal.vet_check);
    
    return matchesSearch && matchesLocation && matchesSpecies && matchesClass && matchesGender && matchesVetCheck;
  });

  // Szétválasztás hűtött és elszállított állatokra
  const cooledAnimals = filteredAnimals.filter(animal => !animal.is_transported);
  const transportedAnimals = filteredAnimals.filter(animal => animal.is_transported);

  const getLocationName = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || "Ismeretlen";
  };

  const getLocationStats = (locationId: string) => {
    // Only count animals that are NOT transported for current count
    const locationAnimals = animals.filter(a => 
      a.storage_location_id === locationId && !a.is_transported
    );
    
    // Calculate monthly cooling value - all animals cooled this month at this location
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyAnimals = animals.filter(a => {
      if (!a.cooling_date || a.storage_location_id !== locationId) return false;
      const date = new Date(a.cooling_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const monthlyCoolingValue = monthlyAnimals.reduce((sum, animal) => {
      return sum + getAnimalPrice(animal).gross;
    }, 0);
    
    const currentCount = locationAnimals.length;
    
    // Havi elszállított
    const monthlyShipped = animals.filter(a => {
      if (!a.cooling_date || !a.is_transported) return false;
      const date = new Date(a.cooling_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear && a.storage_location_id === locationId;
    }).length;

    return {
      monthlyCoolingValue: Math.round(monthlyCoolingValue),
      currentCount,
      monthlyShipped,
    };
  };

  const getMonthlyRevenueData = () => {
    const monthlyData: { [key: string]: number } = {};
    const now = new Date();
    
    // Utolsó 12 hónap inicializálása
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = 0;
    }
    
    // Állatok összegzése hónapok szerint
    animals.forEach((animal) => {
      if (!animal.cooling_date) return;
      
      const coolingDate = new Date(animal.cooling_date);
      const monthKey = `${coolingDate.getFullYear()}-${String(coolingDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData.hasOwnProperty(monthKey)) {
        const price = getAnimalPrice(animal);
        monthlyData[monthKey] += price.gross;
      }
    });
    
    // Átalakítás chart formátumra
    return Object.entries(monthlyData).map(([month, revenue]) => {
      const [year, monthNum] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];
      return {
        month: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
        revenue: Math.round(revenue),
      };
    });
  };

  const getCurrentMonthRevenue = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyAnimals = animals.filter(a => {
      if (!a.cooling_date) return false;
      const date = new Date(a.cooling_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    return monthlyAnimals.reduce((sum, animal) => {
      return sum + getAnimalPrice(animal).gross;
    }, 0);
  };

  const getCurrentYearRevenue = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const yearlyAnimals = animals.filter(a => {
      if (!a.cooling_date) return false;
      const date = new Date(a.cooling_date);
      return date.getFullYear() === currentYear;
    });
    
    return yearlyAnimals.reduce((sum, animal) => {
      return sum + getAnimalPrice(animal).gross;
    }, 0);
  };

  const getCapacityData = () => {
    const totalCapacity = locations.reduce((sum, loc) => sum + (loc.capacity || 0), 0);
    const coolingAnimals = animals.filter(a => !a.is_transported).length;
    const freeSpace = Math.max(0, totalCapacity - coolingAnimals);
    
    return [
      { name: 'Hűtött állatok', value: coolingAnimals, color: '#10b981' },
      { name: 'Szabad helyek', value: freeSpace, color: '#94a3b8' },
    ];
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
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-3xl font-bold mb-2">Állat Nyilvántartó</h1>
              <p className="text-primary-foreground/90">Vadászati nyilvántartás és hűtés kezelése</p>
            </div>
          </div>
          <DashboardMenu 
            isAdmin={isAdmin}
            onLogout={handleLogout}
            onPriceUpdated={fetchData}
          />
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
                        <span className="text-muted-foreground">Teljes havi hűtési érték:</span>
                        <span className="font-semibold">{stats.monthlyCoolingValue.toLocaleString("hu-HU")} Ft</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kapacitás kihasználtság
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCapacityData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getCapacityData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Havi bevétel (aktuális hónap)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {getCurrentMonthRevenue().toLocaleString('hu-HU')} Ft
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {animals.filter(a => {
                  if (!a.cooling_date) return false;
                  const date = new Date(a.cooling_date);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).length} állat hűtve ebben a hónapban
              </p>
              <div className="mt-4 pt-4 border-t">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {getCurrentYearRevenue().toLocaleString('hu-HU')} Ft
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {animals.filter(a => {
                    if (!a.cooling_date) return false;
                    const date = new Date(a.cooling_date);
                    const now = new Date();
                    return date.getFullYear() === now.getFullYear();
                  }).length} állat hűtve ebben az évben
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statisztika */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statisztika
              </CardTitle>
              <CardDescription>Havi bevételek a hűtött állatok alapján</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getMonthlyRevenueData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString('hu-HU')} Ft`}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    name="Bevétel (Ft)" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
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
          <div className="space-y-4 mb-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Keresés azonosító, faj vagy vadász alapján..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? "Szűrők elrejtése" : "További szűrők"}
              </Button>
              {selectedAnimals.size > 0 && (
                <Button
                  variant="default"
                  onClick={exportSelectedToExcel}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Excel export ({selectedAnimals.size})
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Helyszín" />
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

                <Select value={filterSpecies} onValueChange={setFilterSpecies}>
                  <SelectTrigger>
                    <SelectValue placeholder="Faj" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden faj</SelectItem>
                    {uniqueSpecies.map((species) => (
                      <SelectItem key={species} value={species}>
                        {species}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Osztály" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden osztály</SelectItem>
                    {uniqueClasses.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden nem</SelectItem>
                    {uniqueGenders.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterVetCheck} onValueChange={setFilterVetCheck}>
                  <SelectTrigger>
                    <SelectValue placeholder="Állatorvosi ellenőrzés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden</SelectItem>
                    <SelectItem value="checked">Ellenőrizve</SelectItem>
                    <SelectItem value="unchecked">Nincs ellenőrizve</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="md:col-span-5"
                >
                  Szűrők törlése
                </Button>
              </div>
            )}
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
                        <TableHead>Nettó ár (Ft)</TableHead>
                        <TableHead>Bruttó ár (Ft)</TableHead>
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
                            <TableCell className="font-bold">
                              {price.net > 0 ? price.net.toLocaleString("hu-HU") : "-"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {price.gross > 0 ? price.gross.toLocaleString("hu-HU") : "-"}
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
                                  price={price.gross}
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
                        <TableHead>Nettó ár (Ft)</TableHead>
                        <TableHead>Bruttó ár (Ft)</TableHead>
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
                            <TableCell className="font-bold">
                              {price.net > 0 ? price.net.toLocaleString("hu-HU") : "-"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {price.gross > 0 ? price.gross.toLocaleString("hu-HU") : "-"}
                            </TableCell>
                            <TableCell>{animal.hunter_name || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-hunt-orange/10 text-hunt-orange border-hunt-orange">
                                {transportDocuments[animal.id] || "Ismeretlen elszállító"}
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
                                  locationName={transportDocuments[animal.id] || "Ismeretlen elszállító"}
                                  price={price.gross}
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
