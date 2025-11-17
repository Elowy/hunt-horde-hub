import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import { getActiveCompany } from "@/components/CompanySwitcher";
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
  class: string | null;
  weight: number | null;
  cooling_date: string | null;
  transported_at: string | null;
  storage_location_id: string;
}

interface StorageLocation {
  id: string;
  name: string;
  cooling_price_per_kg: number | null;
  cooling_vat_rate: number | null;
}

interface TransportDocument {
  id: string;
  transporter_name: string | null;
  transport_date: string;
  transporters: {
    company_name: string;
  } | null;
}

interface TransportDocumentItem {
  animal_id: string;
  transport_document_id: string;
}

interface AvailablePeriod {
  year: number;
  month: number;
  label: string;
}

export const CoolingRevenueReport = () => {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriod[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailablePeriods();
  }, []);

  const fetchAvailablePeriods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all transported animals to get available periods
      const { data: animals, error } = await supabase
        .from("animals")
        .select("transported_at")
        .eq("user_id", user.id)
        .eq("is_transported", true)
        .not("transported_at", "is", null)
        .order("transported_at", { ascending: false });

      if (error) throw error;

      // Extract unique year-month combinations
      const periodsMap = new Map<string, AvailablePeriod>();
      animals?.forEach(animal => {
        if (animal.transported_at) {
          const date = new Date(animal.transported_at);
          const year = date.getFullYear();
          const month = date.getMonth();
          const key = `${year}-${month}`;
          
          if (!periodsMap.has(key)) {
            const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június", 
                               "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
            periodsMap.set(key, {
              year,
              month,
              label: `${year} ${monthNames[month]}`
            });
          }
        }
      });

      const periods = Array.from(periodsMap.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

      setAvailablePeriods(periods);
      if (periods.length > 0 && !selectedPeriod) {
        setSelectedPeriod(`${periods[0].year}-${periods[0].month}`);
      }
    } catch (error: any) {
      console.error("Error fetching periods:", error);
    }
  };

  const generatePDF = async () => {
    if (!selectedPeriod) {
      toast({
        title: "Hiba",
        description: "Kérjük, válasszon egy időszakot!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const [yearStr, monthStr] = selectedPeriod.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);

      // Elszállított állatok lekérdezése
      const { data: transportedAnimals, error: animalsError } = await supabase
        .from("animals")
        .select("id, animal_id, species, class, weight, cooling_date, transported_at, storage_location_id")
        .eq("user_id", user.id)
        .eq("is_transported", true)
        .gte("transported_at", start.toISOString())
        .lte("transported_at", end.toISOString())
        .order("transported_at", { ascending: true });

      if (animalsError) throw animalsError;
      if (!transportedAnimals || transportedAnimals.length === 0) {
        toast({
          title: "Nincs adat",
          description: "Nincs elszállított állat a kiválasztott időszakban.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Hűtési helyszínek lekérdezése
      // Check if super admin is filtering by company
      const activeCompany = getActiveCompany();
      let userIds = [user.id];

      if (activeCompany) {
        const { data: companyProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("company_name", activeCompany);
        
        if (companyProfiles && companyProfiles.length > 0) {
          userIds = companyProfiles.map(p => p.id);
        }
      }

      const { data: locations, error: locationsError } = await supabase
        .from("storage_locations")
        .select("id, name, cooling_price_per_kg, cooling_vat_rate")
        .in("user_id", userIds);

      if (locationsError) throw locationsError;

      // Transport dokumentumok lekérdezése
      const { data: transportDocs, error: docsError } = await supabase
        .from("transport_documents")
        .select(`
          id,
          transporter_name,
          transport_date,
          transporters (
            company_name
          )
        `)
        .eq("user_id", user.id)
        .gte("transport_date", start.toISOString())
        .lte("transport_date", end.toISOString());

      if (docsError) throw docsError;

      // Transport document items lekérdezése
      const { data: docItems, error: itemsError } = await supabase
        .from("transport_document_items")
        .select("animal_id, transport_document_id")
        .in("animal_id", transportedAnimals.map(a => a.id));

      if (itemsError) throw itemsError;

      // Elszállítók szerinti csoportosítás
      const transporterGroups: Record<string, {
        animals: Array<Animal & { netRevenue: number; grossRevenue: number; location: string }>;
        totalWeight: number;
        totalNetRevenue: number;
        totalGrossRevenue: number;
      }> = {};

      transportedAnimals.forEach(animal => {
        const docItem = docItems?.find(item => item.animal_id === animal.id);
        const doc = transportDocs?.find(d => d.id === docItem?.transport_document_id);
        const transporterName = doc?.transporters?.company_name || doc?.transporter_name || "Ismeretlen";

        if (!transporterGroups[transporterName]) {
          transporterGroups[transporterName] = {
            animals: [],
            totalWeight: 0,
            totalNetRevenue: 0,
            totalGrossRevenue: 0,
          };
        }

        const location = locations?.find(loc => loc.id === animal.storage_location_id);
        const weight = animal.weight || 0;
        let netRevenue = 0;
        let grossRevenue = 0;

        if (location && location.cooling_price_per_kg && weight > 0) {
          netRevenue = weight * location.cooling_price_per_kg;
          const vatRate = location.cooling_vat_rate || 27;
          grossRevenue = netRevenue * (1 + vatRate / 100);
        }

        transporterGroups[transporterName].animals.push({
          ...animal,
          netRevenue,
          grossRevenue,
          location: location?.name || "Ismeretlen"
        });
        transporterGroups[transporterName].totalWeight += weight;
        transporterGroups[transporterName].totalNetRevenue += netRevenue;
        transporterGroups[transporterName].totalGrossRevenue += grossRevenue;
      });

      // PDF generálás
      const doc = new jsPDF();
      const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június", 
                         "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
      const monthName = monthNames[month];
      const dateStr = `${year} ${monthName}`;

      doc.setFontSize(18);
      doc.text("Hutesi Dij Bevetelek Osszesitoje", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Idoszak: ${dateStr}`, 105, 30, { align: "center" });
      doc.text(`Keszites datuma: ${new Date().toLocaleDateString("hu-HU")}`, 105, 37, { align: "center" });

      let yPos = 50;

      // Összesítő táblázat
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("Osszesito elszallitok szerint", 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("Elszallito", 20, yPos);
      doc.text("Allatok", 85, yPos);
      doc.text("Suly (kg)", 115, yPos);
      doc.text("Netto (Ft)", 145, yPos);
      doc.text("Brutto (Ft)", 175, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 7;

      let grandTotalWeight = 0;
      let grandTotalNetRevenue = 0;
      let grandTotalGrossRevenue = 0;
      let grandTotalAnimals = 0;

      Object.entries(transporterGroups).forEach(([transporter, data]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(transporter.substring(0, 25), 20, yPos);
        doc.text(data.animals.length.toString(), 90, yPos);
        doc.text(data.totalWeight.toFixed(1), 120, yPos);
        doc.text(Math.round(data.totalNetRevenue).toLocaleString("hu-HU"), 150, yPos);
        doc.text(Math.round(data.totalGrossRevenue).toLocaleString("hu-HU"), 180, yPos);
        
        grandTotalWeight += data.totalWeight;
        grandTotalNetRevenue += data.totalNetRevenue;
        grandTotalGrossRevenue += data.totalGrossRevenue;
        grandTotalAnimals += data.animals.length;
        
        yPos += 7;
      });

      // Összesen sor
      yPos += 3;
      doc.setFont(undefined, 'bold');
      doc.text("OSSZES:", 20, yPos);
      doc.text(grandTotalAnimals.toString(), 90, yPos);
      doc.text(grandTotalWeight.toFixed(1), 120, yPos);
      doc.text(Math.round(grandTotalNetRevenue).toLocaleString("hu-HU"), 150, yPos);
      doc.text(Math.round(grandTotalGrossRevenue).toLocaleString("hu-HU"), 180, yPos);
      doc.setFont(undefined, 'normal');

      // Részletes lista új oldalon
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("Reszletes allat lista", 20, yPos);
      yPos += 10;

      Object.entries(transporterGroups).forEach(([transporter, data]) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`Elszallito: ${transporter}`, 20, yPos);
        yPos += 7;

        doc.setFontSize(8);
        doc.text("Allat ID", 20, yPos);
        doc.text("Faj", 50, yPos);
        doc.text("Suly", 80, yPos);
        doc.text("Helyszin", 100, yPos);
        doc.text("Netto", 135, yPos);
        doc.text("Brutto", 160, yPos);
        doc.text("Elszallitva", 185, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 5;

        data.animals.forEach(animal => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }

          doc.text(animal.animal_id, 20, yPos);
          doc.text(animal.species.substring(0, 15), 50, yPos);
          doc.text((animal.weight || 0).toFixed(1), 80, yPos);
          doc.text(animal.location.substring(0, 20), 100, yPos);
          doc.text(Math.round(animal.netRevenue).toLocaleString("hu-HU"), 135, yPos);
          doc.text(Math.round(animal.grossRevenue).toLocaleString("hu-HU"), 160, yPos);
          doc.text(animal.transported_at ? new Date(animal.transported_at).toLocaleDateString("hu-HU") : "-", 185, yPos);
          
          yPos += 5;
        });

        yPos += 5;
      });

      doc.save(`hutesi_dij_${year}_${String(month + 1).padStart(2, '0')}.pdf`);

      toast({
        title: "Sikeres exportálás",
        description: "PDF riport elkészült.",
      });
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
    <div className="flex gap-2 items-center">
      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Válasszon időszakot" />
        </SelectTrigger>
        <SelectContent>
          {availablePeriods.length === 0 ? (
            <SelectItem value="none" disabled>Nincs elérhető adat</SelectItem>
          ) : (
            availablePeriods.map((period) => (
              <SelectItem key={`${period.year}-${period.month}`} value={`${period.year}-${period.month}`}>
                {period.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button 
        onClick={generatePDF} 
        disabled={loading || availablePeriods.length === 0}
        variant="outline"
        size="sm"
      >
        <FileDown className="h-4 w-4 mr-2" />
        {loading ? "Készítés..." : "PDF letöltés"}
      </Button>
    </div>
  );
};
