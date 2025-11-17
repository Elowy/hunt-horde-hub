import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Eye, Edit, Trash2, MapPin, LogOut, Star, Truck, FileDown, Download, TrendingUp, User, Users as UsersIcon, ChevronDown, Settings, CalendarCheck, List, Ticket, FileText, UserCog, CheckSquare, FileSpreadsheet, MoreVertical, Calendar as CalendarIcon, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { PageHeader } from "@/components/PageHeader";
import { StorageLocationCarousel } from "@/components/StorageLocationCarousel";
import { AddAnimalDialog } from "@/components/AddAnimalDialog";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { QuickActionsSettingsDialog } from "@/components/QuickActionsSettingsDialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { getActiveRole } from "@/components/RoleSwitcher";
import { useSubscription } from "@/hooks/useSubscription";
import { generateTransportTicket } from "@/lib/generateTransportTicket";
import { addTransportTicketToPage } from "@/lib/addTransportTicketToPage";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface StorageLocation {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  is_default: boolean;
  notes: string | null;
  cooling_price_per_kg?: number | null;
  cooling_vat_rate?: number | null;
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
  archived: boolean | null;
  vet_notes: string | null;
  notes: string | null;
  is_transported: boolean;
  transported_at: string | null;
  transporter_name?: string;
  security_zone_id: string | null;
  vet_sample_id: string | null;
  vet_doctor_name: string | null;
  vet_result: string | null;
  transport_cooling_price?: number | null;
  transport_cooling_vat_rate?: number | null;
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
  const isMobile = useIsMobile();
  const { isPro, loading: subscriptionLoading, productId } = useSubscription();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterVetCheck, setFilterVetCheck] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  const [vatRate, setVatRate] = useState<number>(27);
  const [loading, setLoading] = useState(true);
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [showTransportDialog, setShowTransportDialog] = useState(false);
  const [transportDocuments, setTransportDocuments] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isHunter, setIsHunter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLocations, setShowLocations] = useState(() => {
    const saved = localStorage.getItem('dashboard-show-locations');
    if (saved !== null) return JSON.parse(saved);
    return isMobile ? false : true;
  });
  const [showStatistics, setShowStatistics] = useState(() => {
    const saved = localStorage.getItem('dashboard-show-statistics');
    if (saved !== null) return JSON.parse(saved);
    return isMobile ? false : true;
  });
  const [showAnimals, setShowAnimals] = useState(() => {
    const saved = localStorage.getItem('dashboard-show-animals');
    if (saved !== null) return JSON.parse(saved);
    return isMobile ? false : true;
  });
  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedRevenueMonth, setSelectedRevenueMonth] = useState("");
  const [selectedCoolingMonth, setSelectedCoolingMonth] = useState("");
  const [quickAction1, setQuickAction1] = useState("add_animal");
  const [quickAction2, setQuickAction2] = useState("hunting_registration");

  // Ellenőrizzük, hogy a felhasználó ingyenes-e
  // Admin, editor és super admin felhasználók mindig láthatják a statisztikákat
  const PRO_PRODUCT_IDS = ["prod_TQMCsYuGXl2cqX", "prod_TQMCzW95I3TlPz"];
  const NORMAL_PRODUCT_IDS = ["prod_TQMCKFFwVc6lXT", "prod_TQMCwp0XrDYkOB"];
  const isFreeUser = !isAdmin && !isEditor && (!productId || (!PRO_PRODUCT_IDS.includes(productId) && !NORMAL_PRODUCT_IDS.includes(productId) && productId !== "trial_pro"));

  useEffect(() => {
    checkAuth();
    fetchData();
    fetchQuickActionsSettings();
  }, []);

  useEffect(() => {
    // Set first available month when animals are loaded
    if (animals.length > 0 && !selectedMonth) {
      const months = getAvailableMonths();
      if (months.length > 0) {
        setSelectedMonth(months[0]);
      }
    }
    if (animals.length > 0 && !selectedRevenueMonth) {
      const months = getAvailableMonths();
      if (months.length > 0) {
        setSelectedRevenueMonth(months[0]);
      }
    }
    if (animals.length > 0 && !selectedCoolingMonth) {
      const months = getAvailableMonths();
      if (months.length > 0) {
        setSelectedCoolingMonth(months[0]);
      }
    }
  }, [animals]);

  useEffect(() => {
    localStorage.setItem('dashboard-show-locations', JSON.stringify(showLocations));
  }, [showLocations]);

  useEffect(() => {
    localStorage.setItem('dashboard-show-statistics', JSON.stringify(showStatistics));
  }, [showStatistics]);

  useEffect(() => {
    localStorage.setItem('dashboard-show-animals', JSON.stringify(showAnimals));
  }, [showAnimals]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    // Check if user is super admin
    const { data: superAdminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    const isSuperAdmin = !!superAdminRole;

    // If super admin is impersonating a role, use that role
    const impersonateRole = getActiveRole();
    if (isSuperAdmin && impersonateRole && impersonateRole !== "super_admin") {
      setIsAdmin(impersonateRole === "admin");
      setIsEditor(impersonateRole === "editor");
      setIsHunter(impersonateRole === "hunter");
      return;
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!adminRole || isSuperAdmin);

    // Check if user is editor
    const { data: editorRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "editor")
      .maybeSingle();

    setIsEditor(!!editorRole || isSuperAdmin);

    // Check if user is hunter
    const { data: hunterRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "hunter")
      .maybeSingle();

    setIsHunter(!!hunterRole);
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

  const fetchQuickActionsSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("quick_actions_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setQuickAction1(data.action_1);
        setQuickAction2(data.action_2);
      }
    } catch (error) {
      console.error("Error fetching quick actions settings:", error);
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

  const handleBulkDelete = async () => {
    if (selectedAnimals.size === 0) {
      toast({
        title: "Nincs kiválasztott állat",
        description: "Kérjük, válasszon ki legalább egy állatot a törléshez.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `Biztos törli a kiválasztott ${selectedAnimals.size} darab állatot? Ez a művelet nem vonható vissza!`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("animals")
        .delete()
        .in("id", Array.from(selectedAnimals));

      if (error) throw error;

      toast({
        title: "Sikeres törlés",
        description: `${selectedAnimals.size} állat sikeresen törölve.`,
      });

      setSelectedAnimals(new Set());
      fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadTransportTicket = async (animal: Animal) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch security zone data
      let securityZone = null;
      if (animal.security_zone_id) {
        const { data } = await supabase
          .from("security_zones")
          .select(`
            id,
            name,
            settlement_id,
            settlements (
              name
            )
          `)
          .eq("id", animal.security_zone_id)
          .single();
        
        securityZone = data;
      }

      // Generate ticket with temporary transport info
      const ticketBlob = await generateTransportTicket(
        animal,
        {
          document_number: "Előzetes",
          transport_date: new Date().toISOString(),
          transporter_name: null,
          vehicle_plate: null,
        },
        securityZone
      );

      // Download the ticket
      const url = URL.createObjectURL(ticketBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${animal.animal_id}_vadkisero.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Siker!",
        description: "Vadkísérő jegy letöltve!",
      });
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
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    setDateFrom(startOfMonth(now));
    setDateTo(endOfMonth(now));
  };

  const setPreviousMonth = () => {
    const previousMonth = subMonths(new Date(), 1);
    setDateFrom(startOfMonth(previousMonth));
    setDateTo(endOfMonth(previousMonth));
  };

  const setCurrentSeason = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Ha március (2) vagy később, akkor jelenlegi év március 1 - következő év február vége
    // Ha január vagy február, akkor előző év március 1 - jelenlegi év február vége
    if (currentMonth >= 2) {
      // Március 1-től
      setDateFrom(new Date(currentYear, 2, 1)); // március 1
      setDateTo(new Date(currentYear + 1, 1, 28)); // következő év február 28 (vagy 29)
      // Ha szökőév, akkor február 29
      const nextFeb = new Date(currentYear + 1, 1, 29);
      if (nextFeb.getMonth() === 1) {
        setDateTo(nextFeb);
      }
    } else {
      // Január-február
      setDateFrom(new Date(currentYear - 1, 2, 1)); // előző év március 1
      setDateTo(new Date(currentYear, 1, 28)); // jelenlegi év február 28 (vagy 29)
      // Ha szökőév, akkor február 29
      const thisFeb = new Date(currentYear, 1, 29);
      if (thisFeb.getMonth() === 1) {
        setDateTo(thisFeb);
      }
    }
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

  const handleToggleSelectAll = () => {
    const cooledAnimalIds = cooledAnimals.map(animal => animal.id);
    const allSelected = cooledAnimalIds.every(id => selectedAnimals.has(id));
    
    if (allSelected) {
      setSelectedAnimals(new Set());
    } else {
      setSelectedAnimals(new Set(cooledAnimalIds));
    }
  };

  const handleArchiveAnimals = async (animalIds: string[]) => {
    if (!animalIds.length) return;
    if (!confirm(`Biztosan archiválja a kiválasztott ${animalIds.length} állatot?`)) return;

    try {
      const { error } = await supabase
        .from("animals")
        .update({ archived: true })
        .in("id", animalIds);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: `${animalIds.length} állat archiválva!`,
      });

      setSelectedAnimals(new Set());
      fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRestoreAnimals = async (animalIds: string[]) => {
    if (!animalIds.length) return;
    if (!confirm(`Biztosan visszaállítja a kiválasztott ${animalIds.length} állatot?`)) return;

    try {
      const { error } = await supabase
        .from("animals")
        .update({ archived: false })
        .in("id", animalIds);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: `${animalIds.length} állat visszaállítva!`,
      });

      setSelectedAnimals(new Set());
      fetchData();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
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

  const getCoolingRevenue = (animal: Animal): { net: number; gross: number } => {
    if (!animal.weight) return { net: 0, gross: 0 };
    
    // If transported, use the stored transport cooling price
    if (animal.is_transported && animal.transport_cooling_price) {
      const netRevenue = animal.weight * animal.transport_cooling_price;
      const vatRate = animal.transport_cooling_vat_rate || 27;
      const grossRevenue = netRevenue * (1 + vatRate / 100);
      return {
        net: Math.round(netRevenue),
        gross: Math.round(grossRevenue)
      };
    }
    
    // For non-transported animals, don't calculate cooling revenue
    return { net: 0, gross: 0 };
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
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch current cooling prices for each storage location
      const storageLocationIds = [...new Set(selectedAnimalsList.map(a => a.storage_location_id))];
      const { data: currentPrices } = await supabase
        .from("cooling_prices")
        .select("*")
        .in("storage_location_id", storageLocationIds)
        .is("valid_to", null)
        .eq("is_archived", false);

      const priceMap = new Map(
        currentPrices?.map(price => [price.storage_location_id, price]) || []
      );

      // Calculate totals and update animals with transport prices
      let totalWeight = 0;
      let totalPrice = 0;
      
      for (const animal of selectedAnimalsList) {
        const weight = animal.weight || 0;
        totalWeight += weight;
        
        // Get current cooling price for this animal's storage location
        const currentPrice = priceMap.get(animal.storage_location_id);
        if (currentPrice && weight > 0) {
          const netRevenue = weight * currentPrice.cooling_price_per_kg;
          const vatRate = currentPrice.cooling_vat_rate || 27;
          const grossRevenue = netRevenue * (1 + vatRate / 100);
          totalPrice += grossRevenue;
          
          // Update animal with transport cooling price
          await supabase
            .from("animals")
            .update({
              transport_cooling_price: currentPrice.cooling_price_per_kg,
              transport_cooling_vat_rate: currentPrice.cooling_vat_rate,
            })
            .eq("id", animal.id);
        }
      }

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

      // Generate and upload transport tickets (vadkísérő jegyek) for each animal
      // Only for admin and editor roles
      if (isAdmin || isEditor) {
        try {
          // Fetch security zones data for location information
          const securityZoneIds = [...new Set(selectedAnimalsList.map(a => a.security_zone_id).filter(Boolean))];
          const { data: securityZones } = await supabase
            .from("security_zones")
            .select(`
              id,
              name,
              settlement_id,
              settlements (
                name
              )
            `)
            .in("id", securityZoneIds);

          const securityZoneMap = new Map(
            securityZones?.map(zone => [zone.id, zone]) || []
          );

          // Generate and upload a transport ticket for each animal
          for (const animal of selectedAnimalsList) {
            const securityZone = securityZoneMap.get(animal.security_zone_id || "") || null;
            
            const ticketBlob = await generateTransportTicket(
              animal,
              {
                document_number: documentNumber,
                transport_date: transportDate,
                transporter_name: transporterData.company_name,
                vehicle_plate: vehiclePlate,
              },
              securityZone
            );

            // Upload to storage
            const fileName = `${user.id}/${transportDoc.id}/${animal.animal_id}_vadkisero.pdf`;
            const { error: uploadError } = await supabase.storage
              .from("transport-tickets")
              .upload(fileName, ticketBlob, {
                contentType: "application/pdf",
                upsert: true,
              });

            if (uploadError) {
              console.error("Error uploading transport ticket:", uploadError);
              // Don't throw, continue with other tickets
            }
          }
        } catch (ticketError) {
          console.error("Error generating transport tickets:", ticketError);
          // Don't stop the whole process if ticket generation fails
        }
      }

      // PDF generálás (main transport document)
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
      
      // Add transport tickets (vadkísérő jegyek) for each animal as separate pages
      if (isAdmin || isEditor) {
        try {
          // Fetch security zones data
          const securityZoneIds = [...new Set(selectedAnimalsList.map(a => a.security_zone_id).filter(Boolean))];
          const { data: securityZones } = await supabase
            .from("security_zones")
            .select(`
              id,
              name,
              settlement_id,
              settlements (
                name
              )
            `)
            .in("id", securityZoneIds);

          const securityZoneMap = new Map(
            securityZones?.map((zone: any) => [zone.id, zone]) || []
          );

          // Generate a transport ticket page for each animal
          for (const animal of selectedAnimalsList) {
            doc.addPage();
            const securityZone = securityZoneMap.get(animal.security_zone_id || "") || null;
            
            // Add transport ticket to the PDF
            await addTransportTicketToPage(
              doc,
              animal,
              {
                document_number: documentNumber,
                transport_date: transportDate,
                transporter_name: transporterData.company_name,
                vehicle_plate: vehiclePlate,
              },
              securityZone
            );
          }
        } catch (ticketError) {
          console.error("Error adding transport tickets to PDF:", ticketError);
          // Continue even if ticket generation fails
        }
      }
      
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
    
    // Date filter - use cooling_date for cooled animals, transported_at for transported
    const animalDate = animal.is_transported && animal.transported_at 
      ? new Date(animal.transported_at) 
      : animal.cooling_date 
        ? new Date(animal.cooling_date) 
        : null;
    
    const matchesDateFrom = !dateFrom || !animalDate || animalDate >= dateFrom;
    const matchesDateTo = !dateTo || !animalDate || animalDate <= new Date(dateTo.setHours(23, 59, 59, 999));
    
    // Hunters should not see transported animals
    const matchesTransportStatus = !isHunter || !animal.is_transported;
    
    return matchesSearch && matchesLocation && matchesSpecies && matchesClass && matchesGender && matchesVetCheck && matchesDateFrom && matchesDateTo && matchesTransportStatus;
  });

  // Szétválasztás hűtött, elszállított és archivált állatokra
  const cooledAnimals = filteredAnimals.filter(animal => !animal.is_transported && !animal.archived);
  const transportedAnimals = filteredAnimals.filter(animal => animal.is_transported && !animal.archived);
  const archivedAnimals = filteredAnimals.filter(animal => animal.archived);

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

  const getMonthRevenue = (monthKey: string) => {
    if (!monthKey) return 0;
    
    const [year, month] = monthKey.split('-').map(Number);
    
    const monthlyAnimals = animals.filter(a => {
      if (!a.cooling_date) return false;
      const date = new Date(a.cooling_date);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
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

  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    animals.forEach(animal => {
      if (animal.cooling_date) {
        const date = new Date(animal.cooling_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthsSet.add(monthKey);
      }
    });
    return Array.from(monthsSet).sort().reverse();
  };

  const getMonthlySpeciesStats = (monthKey: string) => {
    if (!monthKey) return [];
    
    const [year, month] = monthKey.split('-').map(Number);
    const monthAnimals = animals.filter(animal => {
      if (!animal.cooling_date) return false;
      const date = new Date(animal.cooling_date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });

    // Group by species
    const speciesMap = new Map<string, { count: number; weight: number; netRevenue: number; grossRevenue: number }>();
    
    monthAnimals.forEach(animal => {
      const species = animal.species;
      if (!speciesMap.has(species)) {
        speciesMap.set(species, { count: 0, weight: 0, netRevenue: 0, grossRevenue: 0 });
      }
      
      const stats = speciesMap.get(species)!;
      stats.count += 1;
      stats.weight += animal.weight || 0;
      
      // Calculate revenue
      const price = getAnimalPrice(animal);
      stats.netRevenue += price.net;
      stats.grossRevenue += price.gross;
    });

    return Array.from(speciesMap.entries()).map(([species, stats]) => ({
      species,
      count: stats.count,
      weight: stats.weight,
      netRevenue: stats.netRevenue,
      grossRevenue: stats.grossRevenue,
    })).sort((a, b) => b.count - a.count);
  };

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 
                       'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getTotalCoolingRevenue = () => {
    return animals.reduce((sum, animal) => {
      if (animal.is_transported || !animal.weight) return sum;
      
      const location = locations.find(loc => loc.id === animal.storage_location_id);
      if (!location || !location.cooling_price_per_kg) return sum;
      
      const netRevenue = animal.weight * location.cooling_price_per_kg;
      const vatRate = location.cooling_vat_rate || 27;
      const grossRevenue = netRevenue * (1 + vatRate / 100);
      
      return sum + grossRevenue;
    }, 0);
  };

  const getMonthCoolingRevenue = (monthKey: string) => {
    if (!monthKey) return 0;
    
    const [year, month] = monthKey.split('-').map(Number);
    
    return animals.reduce((sum, animal) => {
      if (animal.is_transported || !animal.weight || !animal.cooling_date) return sum;
      
      const date = new Date(animal.cooling_date);
      if (date.getMonth() + 1 !== month || date.getFullYear() !== year) return sum;
      
      const location = locations.find(loc => loc.id === animal.storage_location_id);
      if (!location || !location.cooling_price_per_kg) return sum;
      
      const netRevenue = animal.weight * location.cooling_price_per_kg;
      const vatRate = location.cooling_vat_rate || 27;
      const grossRevenue = netRevenue * (1 + vatRate / 100);
      
      return sum + grossRevenue;
    }, 0);
  };

  const renderQuickActionButton = (action: string, index: number) => {
    const buttonClass = "flex-1";
    
    switch (action) {
      case "add_animal":
        return <AddAnimalDialog key={`action-${index}`} onAnimalAdded={fetchData} />;
      
      case "hunting_registration":
        return (
          <Button 
            key={`action-${index}`}
            onClick={() => navigate("/hunting-registrations")}
            variant="secondary"
            className={buttonClass}
          >
            <CalendarCheck className="h-4 w-4 mr-2" />
            Beiratkozás
          </Button>
        );
      
      case "hunting_registrations":
        return (
          <Button 
            key={`action-${index}`}
            onClick={() => navigate("/hunting-registrations")}
            variant="secondary"
            className={buttonClass}
          >
            <List className="h-4 w-4 mr-2" />
            Beiratkozások
          </Button>
        );
      
      case "hunters":
        return (
          <Button 
            key={`action-${index}`}
            onClick={() => navigate("/hired-hunters")}
            variant="secondary"
            className={buttonClass}
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Bérvadászok
          </Button>
        );
      
      case "tickets":
        return (
          <Button 
            key={`action-${index}`}
            onClick={() => navigate("/tickets")}
            variant="secondary"
            className={buttonClass}
          >
            <Ticket className="h-4 w-4 mr-2" />
            Támogatás
          </Button>
        );
      
      case "reports":
        return (
          <Button 
            key={`action-${index}`}
            onClick={() => navigate("/reports")}
            variant="secondary"
            className={buttonClass}
          >
            <FileText className="h-4 w-4 mr-2" />
            Jelentések
          </Button>
        );
      
      case "settings":
        return (
          <Button 
            key={`action-${index}`}
            onClick={() => navigate("/settings")}
            variant="secondary"
            className={buttonClass}
          >
            <Settings className="h-4 w-4 mr-2" />
            Beállítások
          </Button>
        );
      
      case "users":
        return (
          <Button 
            key={`action-${index}`}
            onClick={() => navigate("/users")}
            variant="secondary"
            className={buttonClass}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Felhasználók
          </Button>
        );
      
      default:
        return (
          <Button 
            key={`action-${index}`}
            onClick={() => navigate("/hunting-registrations")}
            variant="secondary"
            className={buttonClass}
          >
            <CalendarCheck className="h-4 w-4 mr-2" />
            Beiratkozás
          </Button>
        );
    }
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
      <PageHeader 
        isAdmin={isAdmin}
        isEditor={isEditor}
        isHunter={isHunter}
        onLogout={handleLogout}
        onPriceUpdated={fetchData}
      />

      {/* View Settings Dialog */}
      <Dialog open={viewSettingsOpen} onOpenChange={setViewSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nézet testreszabása</DialogTitle>
            <DialogDescription>
              Válassza ki, mely szakaszokat szeretné megjeleníteni a dashboard-on
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isHunter && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-locations" className="cursor-pointer">
                    Hűtési helyszínek
                  </Label>
                  <Checkbox
                    id="show-locations"
                    checked={showLocations}
                    onCheckedChange={setShowLocations}
                  />
                </div>
                {!isFreeUser && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-statistics" className="cursor-pointer">
                      Statisztikák
                    </Label>
                    <Checkbox
                      id="show-statistics"
                      checked={showStatistics}
                      onCheckedChange={setShowStatistics}
                    />
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-animals" className="cursor-pointer">
                Állat nyilvántartás
              </Label>
              <Checkbox
                id="show-animals"
                checked={showAnimals}
                onCheckedChange={setShowAnimals}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setViewSettingsOpen(false)}>
              Bezárás
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-6 py-8">
        {/* Dashboard specific content header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-forest-deep mb-2">Vadgondnok</h2>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Vadászati nyilvántartás és hűtés kezelése</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewSettingsOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Nézet testreszabása
            </Button>
          </div>
        </div>



        {/* Mobil nézet gyorsgombok - csak admin, super admin, és szerkesztő számára */}
        {isMobile && (isAdmin || isEditor) && (
          <>
            <div className="flex gap-2 mb-4">
              {renderQuickActionButton(quickAction1, 1)}
              {renderQuickActionButton(quickAction2, 2)}
            </div>
            <div className="flex justify-center mb-6">
              <QuickActionsSettingsDialog onSettingsChanged={fetchQuickActionsSettings} />
            </div>
          </>
        )}


        {/* Announcement Banner */}
        <AnnouncementBanner isAdmin={isAdmin} isEditor={isEditor} />

        {/* Hűtési helyszínek - csak ha nem vadász */}
        {!isHunter && (
          <Collapsible open={showLocations} onOpenChange={setShowLocations} className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                    <ChevronDown className={`h-5 w-5 transition-transform ${showLocations ? '' : '-rotate-90'}`} />
                  </Button>
                </CollapsibleTrigger>
                <h2 className="text-2xl font-bold text-forest-deep">Hűtési helyszínek</h2>
              </div>
              <StorageLocationDialog onLocationAdded={fetchData} currentLocationCount={locations.length} />
            </div>
            
            <CollapsibleContent>
              {locations.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Még nincs hűtési helyszín. Adjon hozzá egyet a kezdéshez!
                  </CardContent>
                </Card>
              ) : (
                <StorageLocationCarousel
                  locations={locations}
                  getLocationStats={getLocationStats}
                  onSetDefault={handleSetDefaultLocation}
                  onDelete={handleDeleteLocation}
                  onLocationUpdated={fetchData}
                />
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Statisztika - csak ha nem vadász és nem ingyenes felhasználó, becsukható */}
        {!isHunter && !isFreeUser && (
          <Collapsible open={showStatistics} onOpenChange={setShowStatistics} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                  <ChevronDown className={`h-5 w-5 transition-transform ${showStatistics ? '' : '-rotate-90'}`} />
                </Button>
              </CollapsibleTrigger>
              <h2 className="text-2xl font-bold text-forest-deep">Statisztika</h2>
            </div>
            
            <CollapsibleContent className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Kapacitás kihasználtság
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
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
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Foglalt helyek:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {animals.filter(a => !a.is_transported).length} db
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Szabad helyek:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {Math.max(0, locations.reduce((sum, loc) => sum + (loc.capacity || 0), 0) - animals.filter(a => !a.is_transported).length)} db
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground font-semibold">Összes hely:</span>
                        <span className="font-bold">
                          {locations.reduce((sum, loc) => sum + (loc.capacity || 0), 0)} db
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Havi bevétel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Select value={selectedRevenueMonth} onValueChange={setSelectedRevenueMonth}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Válasszon hónapot" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableMonths().map((monthKey) => (
                            <SelectItem key={monthKey} value={monthKey}>
                              {formatMonthLabel(monthKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {getMonthRevenue(selectedRevenueMonth).toLocaleString('hu-HU')} Ft
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedRevenueMonth && animals.filter(a => {
                        if (!a.cooling_date) return false;
                        const date = new Date(a.cooling_date);
                        const [year, month] = selectedRevenueMonth.split('-').map(Number);
                        return date.getMonth() + 1 === month && date.getFullYear() === year;
                      }).length} állat hűtve ebben a hónapban
                    </p>
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {getCurrentYearRevenue().toLocaleString('hu-HU')} Ft
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Éves bevétel (aktuális év)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Hűtési díj bevétel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Select value={selectedCoolingMonth} onValueChange={setSelectedCoolingMonth}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Válasszon hónapot" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableMonths().map((monthKey) => (
                            <SelectItem key={monthKey} value={monthKey}>
                              {formatMonthLabel(monthKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {getMonthCoolingRevenue(selectedCoolingMonth).toLocaleString('hu-HU')} Ft
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Kiválasztott hónap hűtési díja
                    </p>
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {getTotalCoolingRevenue().toLocaleString('hu-HU')} Ft
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Összes jelenleg hűtött állat
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bevételi grafikon */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Havi bevételek
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

              {/* Fajonkénti havi elejtési statisztika */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Fajonkénti havi elejtési statisztika
                  </CardTitle>
                  <CardDescription>Elejtett állatok fajonként a kiválasztott hónapban</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Month selector */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Hónap:</label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Válasszon hónapot" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableMonths().map((monthKey) => (
                            <SelectItem key={monthKey} value={monthKey}>
                              {formatMonthLabel(monthKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Species statistics table */}
                    {selectedMonth && getMonthlySpeciesStats(selectedMonth).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vadfaj</TableHead>
                            <TableHead className="text-right">Elejtett állatok (db)</TableHead>
                            <TableHead className="text-right">Összsúly (kg)</TableHead>
                            <TableHead className="text-right">Nettó bevétel (Ft)</TableHead>
                            <TableHead className="text-right">Bruttó bevétel (Ft)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getMonthlySpeciesStats(selectedMonth).map((stat) => (
                            <TableRow key={stat.species}>
                              <TableCell className="font-medium">{stat.species}</TableCell>
                              <TableCell className="text-right">{stat.count}</TableCell>
                              <TableCell className="text-right">{stat.weight.toFixed(1)} kg</TableCell>
                              <TableCell className="text-right font-semibold">
                                {stat.netRevenue.toLocaleString('hu-HU')} Ft
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                                {stat.grossRevenue.toLocaleString('hu-HU')} Ft
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Total row */}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell>Összesen</TableCell>
                            <TableCell className="text-right">
                              {getMonthlySpeciesStats(selectedMonth).reduce((sum, stat) => sum + stat.count, 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {getMonthlySpeciesStats(selectedMonth).reduce((sum, stat) => sum + stat.weight, 0).toFixed(1)} kg
                            </TableCell>
                            <TableCell className="text-right">
                              {getMonthlySpeciesStats(selectedMonth).reduce((sum, stat) => sum + stat.netRevenue, 0).toLocaleString('hu-HU')} Ft
                            </TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400">
                              {getMonthlySpeciesStats(selectedMonth).reduce((sum, stat) => sum + stat.grossRevenue, 0).toLocaleString('hu-HU')} Ft
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {selectedMonth ? "Nincs adat a kiválasztott hónapra" : "Válasszon egy hónapot"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Állat nyilvántartás */}
        <Collapsible open={showAnimals} onOpenChange={setShowAnimals} className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                  <ChevronDown className={`h-5 w-5 transition-transform ${showAnimals ? '' : '-rotate-90'}`} />
                </Button>
              </CollapsibleTrigger>
              <h2 className="text-2xl font-bold text-forest-deep">Állat nyilvántartás</h2>
            </div>
            <AddAnimalDialog onAnimalAdded={fetchData} />
          </div>
          
          <CollapsibleContent>

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

                {/* Dátum szűrő - Ettől */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "yyyy. MM. dd.") : "Dátum-tól"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border border-border z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {/* Dátum szűrő - Eddig */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "yyyy. MM. dd.") : "Dátum-ig"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border border-border z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {/* Dátum gyorsgombok */}
                <div className="md:col-span-5 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={setCurrentMonth}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Jelenlegi hónap
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={setPreviousMonth}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Előző hónap
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={setCurrentSeason}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Jelenlegi idény
                  </Button>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Dátum törlése
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="md:col-span-5"
                >
                  Összes szűrő törlése
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
            <Tabs defaultValue="cooled" className="w-full" onValueChange={() => setSelectedAnimals(new Set())}>
              {!isHunter ? (
                <TabsList className="grid w-full max-w-3xl grid-cols-3">
                  <TabsTrigger value="cooled">
                    Jelenleg hűtött állatok ({cooledAnimals.length})
                  </TabsTrigger>
                  <TabsTrigger value="transported">
                    Már elszállított állatok ({transportedAnimals.length})
                  </TabsTrigger>
                  <TabsTrigger value="archived">
                    Archivált állatok ({archivedAnimals.length})
                  </TabsTrigger>
                </TabsList>
              ) : (
                <TabsList className="grid w-full max-w-md grid-cols-1">
                  <TabsTrigger value="cooled">
                    Jelenleg hűtött állatok ({cooledAnimals.length})
                  </TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="cooled">
                {/* Elszállító, Excel export és csoportos műveletek gombok */}
                {!isHunter && selectedAnimals.size > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2 justify-end">
                    <Button onClick={handleCreateTransport} variant="default">
                      <FileDown className="h-4 w-4 mr-2" />
                      Elszállító készítése ({selectedAnimals.size} állat)
                    </Button>
                    <Button onClick={exportSelectedToExcel} variant="outline">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel export
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <MoreVertical className="h-4 w-4 mr-2" />
                          Csoportos műveletek
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border border-border z-50">
                        <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive hover:bg-destructive/10 cursor-pointer">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Kijelöltek törlése
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {!isHunter && (
                          <TableHead className="w-[50px]">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={handleToggleSelectAll}
                              title={cooledAnimals.every(a => selectedAnimals.has(a.id)) ? "Kijelölés törlése" : "Összes kijelölése"}
                            >
                              <CheckSquare className="h-4 w-4" />
                            </Button>
                          </TableHead>
                        )}
                        <TableHead>Azonosító</TableHead>
                        <TableHead>Faj</TableHead>
                        <TableHead>Súly (kg)</TableHead>
                        <TableHead>Osztály</TableHead>
                        {!isHunter && <TableHead>Nettó ár (Ft)</TableHead>}
                        {!isHunter && <TableHead>Bruttó ár (Ft)</TableHead>}
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
                            {!isHunter && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedAnimals.has(animal.id)}
                                  onCheckedChange={() => toggleAnimalSelection(animal.id)}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-medium">{animal.animal_id}</TableCell>
                            <TableCell>{animal.species}</TableCell>
                            <TableCell>{animal.weight || "-"}</TableCell>
                            <TableCell>{animal.class || "-"}</TableCell>
                            {!isHunter && (
                              <TableCell className="font-bold">
                                {price.net > 0 ? price.net.toLocaleString("hu-HU") : "-"}
                              </TableCell>
                            )}
                            {!isHunter && (
                              <TableCell className="font-semibold">
                                {price.gross > 0 ? price.gross.toLocaleString("hu-HU") : "-"}
                              </TableCell>
                            )}
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
                                {!isHunter && (
                                  <>
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
                                      onClick={() => handleDownloadTransportTicket(animal)}
                                      title="Vadkísérő jegy letöltése"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleDeleteAnimal(animal)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {!isHunter && (
                <TabsContent value="transported">
                  {/* Archiválás gomb kiválasztott állatokhoz */}
                  {selectedAnimals.size > 0 && (isEditor || isAdmin) && (
                    <div className="mb-4 flex justify-end">
                      <Button 
                        onClick={() => handleArchiveAnimals(Array.from(selectedAnimals))}
                        variant="outline"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Archiválás ({selectedAnimals.size})
                      </Button>
                    </div>
                  )}
                  
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {(isEditor || isAdmin) && (
                            <TableHead className="w-12">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const transportedAnimalIds = transportedAnimals.map(a => a.id);
                                  const allSelected = transportedAnimalIds.every(id => selectedAnimals.has(id));
                                  if (allSelected) {
                                    setSelectedAnimals(new Set());
                                  } else {
                                    setSelectedAnimals(new Set(transportedAnimalIds));
                                  }
                                }}
                                title={transportedAnimals.every(a => selectedAnimals.has(a.id)) ? "Kijelölés törlése" : "Összes kijelölése"}
                              >
                                <CheckSquare className="h-4 w-4" />
                              </Button>
                            </TableHead>
                          )}
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
                              {(isEditor || isAdmin) && (
                                <TableCell>
                                  <Checkbox
                                    checked={selectedAnimals.has(animal.id)}
                                    onCheckedChange={() => toggleAnimalSelection(animal.id)}
                                  />
                                </TableCell>
                              )}
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
                                <Badge variant="outline" className="bg-accent/10 text-accent border-accent">
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
                                  {(isEditor || isAdmin) && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleArchiveAnimals([animal.id])}
                                        title="Archiválás"
                                      >
                                        <FileText className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleDeleteAnimal(animal)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              )}

              {/* Archivált állatok fül */}
              {!isHunter && (isEditor || isAdmin) && (
                <TabsContent value="archived">
                  {/* Visszaállítás gomb */}
                  {selectedAnimals.size > 0 && (
                    <div className="mb-4 flex justify-end">
                      <Button 
                        onClick={() => handleRestoreAnimals(Array.from(selectedAnimals))}
                        variant="outline"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Visszaállítás ({selectedAnimals.size})
                      </Button>
                    </div>
                  )}

                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                const archivedAnimalIds = archivedAnimals.map(a => a.id);
                                const allSelected = archivedAnimalIds.every(id => selectedAnimals.has(id));
                                if (allSelected) {
                                  setSelectedAnimals(new Set());
                                } else {
                                  setSelectedAnimals(new Set(archivedAnimalIds));
                                }
                              }}
                              title={archivedAnimals.every(a => selectedAnimals.has(a.id)) ? "Kijelölés törlése" : "Összes kijelölése"}
                            >
                              <CheckSquare className="h-4 w-4" />
                            </Button>
                          </TableHead>
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
                        {archivedAnimals.map((animal) => {
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
                                  {transportDocuments[animal.id] || getLocationName(animal.storage_location_id)}
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
                                    locationName={transportDocuments[animal.id] || getLocationName(animal.storage_location_id)}
                                    price={price.gross}
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
              )}
            </Tabs>
          )}
          </CollapsibleContent>
        </Collapsible>
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
