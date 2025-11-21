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
import { FileText, Search, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TransportDocument {
  id: string;
  document_number: string;
  transport_date: string;
  total_weight: number;
  total_price: number;
  animal_count: number;
  transporter_name: string | null;
  vehicle_plate: string | null;
  company_name: string;
}

interface TransportDocumentItem {
  animal_id: string;
  animals: {
    animal_id: string;
    species: string;
    weight: number;
    class: string;
    shooting_date: string | null;
    cooling_date: string | null;
    transport_price_per_kg: number | null;
    transport_vat_rate: number | null;
    transport_cooling_price: number | null;
    transport_cooling_vat_rate: number | null;
    storage_locations: {
      name: string;
      address: string | null;
    } | null;
  };
}

export const BuyerTransportDocuments = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<TransportDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
  }, [open]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get buyer profile
      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (buyerError) throw buyerError;
      if (!buyerData) {
        toast({
          title: "Hiba",
          description: "Nincs felvásárló profil",
          variant: "destructive",
        });
        return;
      }

      // Get transport documents for this buyer
      const { data, error } = await supabase
        .from("transport_documents")
        .select("*")
        .eq("buyer_id", buyerData.id)
        .order("transport_date", { ascending: false });

      if (error) throw error;

      // Get unique user_ids to fetch profiles
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];

      // Get profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, company_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id -> company_name
      const profilesMap = new Map(profilesData?.map(p => [p.id, p.company_name]));

      // Merge data
      const documentsWithProfiles = data?.map(doc => ({
        ...doc,
        company_name: profilesMap.get(doc.user_id) || "Ismeretlen"
      }));

      setDocuments(documentsWithProfiles || []);
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

  const handleViewDocument = async (doc: TransportDocument) => {
    try {
      const { data: items, error } = await supabase
        .from("transport_document_items")
        .select(`
          animal_id,
          animals (
            animal_id,
            species,
            weight,
            class,
            shooting_date,
            cooling_date,
            transport_price_per_kg,
            transport_vat_rate,
            transport_cooling_price,
            transport_cooling_vat_rate,
            storage_locations (
              name,
              address
            )
          )
        `)
        .eq("transport_document_id", doc.id);

      if (error) throw error;

      // PDF generálás
      const pdf = new jsPDF();

      // === ELSŐ OLDAL FEJLÉC ===
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Elszállító dokumentum", 105, 20, { align: "center" });

      // Alapadatok táblázat
      let yPos = 35;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");

      // Elszállító, Vadásztársaság, Hűtési helyek megjelenítése táblázatban
      const headerData = [
        ["Elszállító:", doc.transporter_name || "-"],
        ["Vadásztársaság:", doc.company_name],
        ["Bizonylat szám:", doc.document_number],
        ["Szállítás dátuma:", new Date(doc.transport_date).toLocaleDateString("hu-HU")],
      ];

      if (doc.vehicle_plate) {
        headerData.push(["Rendszám:", doc.vehicle_plate]);
      }

      // Hűtési helyek összegyűjtése
      const storageLocations = new Set<string>();
      (items as TransportDocumentItem[])?.forEach((item) => {
        const location = item.animals.storage_locations;
        if (location) {
          storageLocations.add(location.name);
        }
      });

      if (storageLocations.size > 0) {
        headerData.push(["Hűtési hely(ek):", Array.from(storageLocations).join(", ")]);
      }

      autoTable(pdf, {
        startY: yPos,
        body: headerData,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold', fillColor: [240, 240, 240] },
          1: { cellWidth: 140 },
        },
      });

      // === ÁLLATOK TÁBLÁZATA ===
      yPos = (pdf as any).lastAutoTable.finalY + 10;

      // Táblázat fejléc készítése
      const tableHeaders = [
        'Azonosító',
        'Faj',
        'Elejtés',
        'Hűtés',
        'Súly (kg)',
        'Ár nettó (Ft)',
        'Ár bruttó (Ft)',
        'Hűtési díj nettó (Ft)',
        'Hűtési díj bruttó (Ft)'
      ];

      // Táblázat sorok készítése
      const tableRows: any[] = [];
      let totalNetPrice = 0;
      let totalGrossPrice = 0;
      let totalNetCooling = 0;
      let totalGrossCooling = 0;

      (items as TransportDocumentItem[])?.forEach((item) => {
        const animal = item.animals;
        
        // Dátumok formázása
        const shootingDate = animal.shooting_date 
          ? new Date(animal.shooting_date).toLocaleDateString("hu-HU")
          : "-";
        const coolingDate = animal.cooling_date
          ? new Date(animal.cooling_date).toLocaleDateString("hu-HU")
          : "-";
        
        // Állat ára
        const animalNetPrice = (animal.weight || 0) * (animal.transport_price_per_kg || 0);
        const animalVatRate = animal.transport_vat_rate || 27;
        const animalGrossPrice = animalNetPrice * (1 + animalVatRate / 100);
        
        // Hűtési díj
        const coolingNetPrice = (animal.weight || 0) * (animal.transport_cooling_price || 0);
        const coolingVatRate = animal.transport_cooling_vat_rate || 27;
        const coolingGrossPrice = coolingNetPrice * (1 + coolingVatRate / 100);
        
        // Összegek hozzáadása
        totalNetPrice += animalNetPrice;
        totalGrossPrice += animalGrossPrice;
        totalNetCooling += coolingNetPrice;
        totalGrossCooling += coolingGrossPrice;
        
        tableRows.push([
          animal.animal_id,
          animal.species,
          shootingDate,
          coolingDate,
          (animal.weight || 0).toFixed(2),
          Math.round(animalNetPrice).toLocaleString("hu-HU"),
          Math.round(animalGrossPrice).toLocaleString("hu-HU"),
          Math.round(coolingNetPrice).toLocaleString("hu-HU"),
          Math.round(coolingGrossPrice).toLocaleString("hu-HU"),
        ]);
      });

      // Összesítő sorok
      tableRows.push([
        { content: 'ÖSSZESEN', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: Math.round(totalNetPrice).toLocaleString("hu-HU"), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: Math.round(totalGrossPrice).toLocaleString("hu-HU"), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: Math.round(totalNetCooling).toLocaleString("hu-HU"), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: Math.round(totalGrossCooling).toLocaleString("hu-HU"), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      ]);

      tableRows.push([
        { content: 'VÉGÖSSZEG (Állat + Hűtés)', colSpan: 6, styles: { fontStyle: 'bold', fillColor: [220, 220, 220], halign: 'right' } },
        { content: Math.round(totalNetPrice + totalNetCooling).toLocaleString("hu-HU") + ' Ft', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        { content: '', styles: { fillColor: [220, 220, 220] } },
        { content: Math.round(totalGrossPrice + totalGrossCooling).toLocaleString("hu-HU") + ' Ft', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
      ]);

      // Táblázat kirajzolása autoTable-lel (automatikus oldaltörés)
      autoTable(pdf, {
        startY: yPos,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 15, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 25, halign: 'right' },
          8: { cellWidth: 25, halign: 'right' },
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.text(`Elszállító - ${doc.document_number} (folytatás)`, 105, 15, { align: "center" });
          }
        }
      });

      // PDF mentése
      pdf.save(`elszallito_${doc.document_number}.pdf`);

      toast({
        title: "Siker",
        description: "Az elszállító letöltése megtörtént",
      });
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <FileText className="mr-2 h-4 w-4" />
          Elszállítók
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Elszállító dokumentumok</DialogTitle>
          <DialogDescription>
            Az Ön számára készített elszállító dokumentumok listája
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Keresés bizonylat szám vagy vadásztársaság szerint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Betöltés...</div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Nincs találat a keresési feltételeknek megfelelően"
                  : "Még nincsenek elszállító dokumentumok"}
              </p>
            </Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bizonylat szám</TableHead>
                    <TableHead>Vadásztársaság</TableHead>
                    <TableHead>Dátum</TableHead>
                    <TableHead>Állatok száma</TableHead>
                    <TableHead>Össz. súly (kg)</TableHead>
                    <TableHead>Összérték (Ft)</TableHead>
                    <TableHead>Műveletek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {doc.document_number}
                      </TableCell>
                      <TableCell>{doc.company_name}</TableCell>
                      <TableCell>
                        {new Date(doc.transport_date).toLocaleDateString("hu-HU")}
                      </TableCell>
                      <TableCell>{doc.animal_count}</TableCell>
                      <TableCell>{doc.total_weight.toFixed(2)}</TableCell>
                      <TableCell>
                        {Math.round(doc.total_price).toLocaleString("hu-HU")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
