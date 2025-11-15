import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const HuntingSeasonReport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startYear, setStartYear] = useState<string>("");
  const [startMonth, setStartMonth] = useState<string>("");
  const [endYear, setEndYear] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: "0", label: "Január" },
    { value: "1", label: "Február" },
    { value: "2", label: "Március" },
    { value: "3", label: "Április" },
    { value: "4", label: "Május" },
    { value: "5", label: "Június" },
    { value: "6", label: "Július" },
    { value: "7", label: "Augusztus" },
    { value: "8", label: "Szeptember" },
    { value: "9", label: "Október" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
  ];

  const generateExcel = async () => {
    if (!startYear || !startMonth || !endYear || !endMonth) {
      toast({
        title: "Hiba",
        description: "Kérjük, válasszon kezdő és befejező dátumot!",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(parseInt(startYear), parseInt(startMonth), 1);
    const end = new Date(parseInt(endYear), parseInt(endMonth) + 1, 0, 23, 59, 59);

    if (start > end) {
      toast({
        title: "Hiba",
        description: "A kezdő dátum nem lehet későbbi, mint a befejező dátum!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      // Fetch all animals within the date range
      const { data: animals, error: animalsError } = await supabase
        .from("animals")
        .select(`
          *,
          storage_locations (name),
          security_zones (name)
        `)
        .eq("user_id", user.id)
        .gte("cooling_date", start.toISOString())
        .lte("cooling_date", end.toISOString())
        .order("cooling_date", { ascending: true });

      if (animalsError) throw animalsError;

      if (!animals || animals.length === 0) {
        toast({
          title: "Nincs adat",
          description: "Nincs elejtett állat a kiválasztott időszakban.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Prepare data for Excel
      const excelData = animals.map(animal => ({
        "Állat ID": animal.animal_id,
        "Vadfaj": animal.species,
        "Nem": animal.gender || "-",
        "Osztály": animal.class || "-",
        "Súly (kg)": animal.weight || 0,
        "Életkor": animal.age || "-",
        "Állapot": animal.condition || "-",
        "Vadász neve": animal.hunter_name || "-",
        "Vadász típus": animal.hunter_type || "-",
        "Hűtési helyszín": animal.storage_locations?.name || "-",
        "Biztonsági körzet": animal.security_zones?.name || "-",
        "Hűtés dátuma": animal.cooling_date ? new Date(animal.cooling_date).toLocaleDateString('hu-HU') : "-",
        "Lejárati dátum": animal.expiry_date ? new Date(animal.expiry_date).toLocaleDateString('hu-HU') : "-",
        "Mintavétel dátuma": animal.sample_date ? new Date(animal.sample_date).toLocaleDateString('hu-HU') : "-",
        "Minta ID": animal.sample_id || "-",
        "Állatorvosi ellenőrzés": animal.vet_check ? "Igen" : "Nem",
        "Állatorvos neve": animal.vet_doctor_name || "-",
        "Állatorvosi minta ID": animal.vet_sample_id || "-",
        "Állatorvosi eredmény": animal.vet_result || "-",
        "Állatorvosi megjegyzések": animal.vet_notes || "-",
        "Elszállítva": animal.is_transported ? "Igen" : "Nem",
        "Elszállítás dátuma": animal.transported_at ? new Date(animal.transported_at).toLocaleDateString('hu-HU') : "-",
        "Megjegyzések": animal.notes || "-",
        "Létrehozva": new Date(animal.created_at).toLocaleDateString('hu-HU'),
        "Módosítva": new Date(animal.updated_at).toLocaleDateString('hu-HU'),
      }));

      // Create summary sheet
      const summary = {
        "Összes elejtett állat": animals.length,
        "Időszak kezdete": start.toLocaleDateString('hu-HU'),
        "Időszak vége": end.toLocaleDateString('hu-HU'),
        "Összes súly (kg)": animals.reduce((sum, a) => sum + (a.weight || 0), 0).toFixed(2),
        "Elszállított állatok": animals.filter(a => a.is_transported).length,
        "Jelenleg hűtött állatok": animals.filter(a => !a.is_transported).length,
      };

      // Species breakdown
      const speciesCount: Record<string, number> = {};
      animals.forEach(animal => {
        speciesCount[animal.species] = (speciesCount[animal.species] || 0) + 1;
      });

      const speciesData = Object.entries(speciesCount).map(([species, count]) => ({
        "Vadfaj": species,
        "Darabszám": count,
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add summary sheet
      const summaryWs = XLSX.utils.json_to_sheet([summary]);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Összesítő");

      // Add species breakdown
      const speciesWs = XLSX.utils.json_to_sheet(speciesData);
      XLSX.utils.book_append_sheet(wb, speciesWs, "Vadfajok");

      // Add detailed data
      const detailsWs = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, detailsWs, "Részletes adatok");

      // Auto-size columns for all sheets
      const sheets = [summaryWs, speciesWs, detailsWs];
      sheets.forEach((ws, idx) => {
        const data = idx === 0 ? [summary] : idx === 1 ? speciesData : excelData;
        const maxWidth = 50;
        const colWidths = Object.keys(data[0] || {}).map(key => ({
          wch: Math.min(
            maxWidth,
            Math.max(
              key.length,
              ...data.map(row => String(row[key as keyof typeof row]).length)
            )
          )
        }));
        ws['!cols'] = colWidths;
      });

      const fileName = `vadelejtesek_${startYear}_${String(parseInt(startMonth) + 1).padStart(2, '0')}_${endYear}_${String(parseInt(endMonth) + 1).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Sikeres exportálás",
        description: `${animals.length} állat adatai exportálva Excel fájlba.`,
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kezdő év</Label>
          <Select value={startYear} onValueChange={setStartYear}>
            <SelectTrigger>
              <SelectValue placeholder="Válasszon évet" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kezdő hónap</Label>
          <Select value={startMonth} onValueChange={setStartMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Válasszon hónapot" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Befejező év</Label>
          <Select value={endYear} onValueChange={setEndYear}>
            <SelectTrigger>
              <SelectValue placeholder="Válasszon évet" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Befejező hónap</Label>
          <Select value={endMonth} onValueChange={setEndMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Válasszon hónapot" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        onClick={generateExcel} 
        disabled={loading}
        className="w-full"
      >
        <FileDown className="h-4 w-4 mr-2" />
        {loading ? "Készítés..." : "Excel riport letöltése"}
      </Button>
    </div>
  );
};
