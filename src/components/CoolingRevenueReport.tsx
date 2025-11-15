import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
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

export const CoolingRevenueReport = () => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  const [loading, setLoading] = useState(false);

  const getMonthRange = (monthOffset: number = 0) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  };

  const generatePDF = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const monthOffset = selectedMonth === "current" ? 0 : -1;
      const { start, end } = getMonthRange(monthOffset);

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
      const { data: locations, error: locationsError } = await supabase
        .from("storage_locations")
        .select("id, name, cooling_price_per_kg, cooling_vat_rate")
        .eq("user_id", user.id);

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
        animals: Animal[];
        totalWeight: number;
        totalRevenue: number;
      }> = {};

      transportedAnimals.forEach(animal => {
        const docItem = docItems?.find(item => item.animal_id === animal.id);
        const doc = transportDocs?.find(d => d.id === docItem?.transport_document_id);
        const transporterName = doc?.transporters?.company_name || doc?.transporter_name || "Ismeretlen";

        if (!transporterGroups[transporterName]) {
          transporterGroups[transporterName] = {
            animals: [],
            totalWeight: 0,
            totalRevenue: 0,
          };
        }

        const location = locations?.find(loc => loc.id === animal.storage_location_id);
        const weight = animal.weight || 0;
        let revenue = 0;

        if (location && location.cooling_price_per_kg && weight > 0) {
          const netRevenue = weight * location.cooling_price_per_kg;
          const vatRate = location.cooling_vat_rate || 27;
          revenue = netRevenue * (1 + vatRate / 100);
        }

        transporterGroups[transporterName].animals.push(animal);
        transporterGroups[transporterName].totalWeight += weight;
        transporterGroups[transporterName].totalRevenue += revenue;
      });

      // PDF generálás
      const doc = new jsPDF();
      const monthName = selectedMonth === "current" ? "Jelenlegi hónap" : "Előző hónap";
      const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

      doc.setFontSize(18);
      doc.text("Hutesi Dij Bevetek Osszesitoje", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.text(`Idoszak: ${monthName} (${dateStr})`, 105, 30, { align: "center" });
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
      doc.text("Allatok szama", 90, yPos);
      doc.text("Osszes suly (kg)", 130, yPos);
      doc.text("Bevetel (Ft)", 170, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 7;

      let grandTotalWeight = 0;
      let grandTotalRevenue = 0;
      let grandTotalAnimals = 0;

      Object.entries(transporterGroups).forEach(([transporter, data]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(transporter.substring(0, 30), 20, yPos);
        doc.text(data.animals.length.toString(), 100, yPos);
        doc.text(data.totalWeight.toFixed(2), 140, yPos);
        doc.text(Math.round(data.totalRevenue).toLocaleString("hu-HU"), 175, yPos);
        
        grandTotalWeight += data.totalWeight;
        grandTotalRevenue += data.totalRevenue;
        grandTotalAnimals += data.animals.length;
        
        yPos += 7;
      });

      // Összesen sor
      yPos += 3;
      doc.setFont(undefined, 'bold');
      doc.text("OSSZES:", 20, yPos);
      doc.text(grandTotalAnimals.toString(), 100, yPos);
      doc.text(grandTotalWeight.toFixed(2), 140, yPos);
      doc.text(Math.round(grandTotalRevenue).toLocaleString("hu-HU"), 175, yPos);
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

        doc.setFontSize(9);
        doc.text("Azonosito", 20, yPos);
        doc.text("Faj", 60, yPos);
        doc.text("Osztaly", 90, yPos);
        doc.text("Suly", 120, yPos);
        doc.text("Hutesi dij", 150, yPos);
        doc.text("Elszallitva", 180, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 5;

        data.animals.forEach(animal => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }

          const location = locations?.find(loc => loc.id === animal.storage_location_id);
          const weight = animal.weight || 0;
          let revenue = 0;

          if (location && location.cooling_price_per_kg && weight > 0) {
            const netRevenue = weight * location.cooling_price_per_kg;
            const vatRate = location.cooling_vat_rate || 27;
            revenue = netRevenue * (1 + vatRate / 100);
          }

          doc.text(animal.animal_id, 20, yPos);
          doc.text(animal.species, 60, yPos);
          doc.text(animal.class || "-", 90, yPos);
          doc.text(weight.toFixed(2), 120, yPos);
          doc.text(Math.round(revenue).toLocaleString("hu-HU"), 150, yPos);
          doc.text(animal.transported_at ? new Date(animal.transported_at).toLocaleDateString("hu-HU") : "-", 180, yPos);
          
          yPos += 5;
        });

        yPos += 5;
      });

      doc.save(`hutesi_dij_${dateStr}.pdf`);

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
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Jelenlegi hónap</SelectItem>
          <SelectItem value="previous">Előző hónap</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        onClick={generatePDF} 
        disabled={loading}
        variant="outline"
        size="sm"
      >
        <FileDown className="h-4 w-4 mr-2" />
        {loading ? "Készítés..." : "Hűtési díj riport"}
      </Button>
    </div>
  );
};
