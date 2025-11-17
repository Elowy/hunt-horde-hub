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
            class
          )
        `)
        .eq("transport_document_id", doc.id);

      if (error) throw error;

      // PDF generálás
      const pdf = new jsPDF();
      
      pdf.setFontSize(20);
      pdf.text("Elszallito", 105, 20, { align: "center" });
      
      pdf.setFontSize(12);
      pdf.text(`Vadasztarsasag: ${doc.company_name}`, 20, 35);
      pdf.text(`Bizonylat szam: ${doc.document_number}`, 20, 45);
      pdf.text(`Datum: ${new Date(doc.transport_date).toLocaleDateString("hu-HU")}`, 20, 55);
      if (doc.transporter_name) {
        pdf.text(`Szallito: ${doc.transporter_name}`, 20, 65);
      }
      if (doc.vehicle_plate) {
        pdf.text(`Rendszam: ${doc.vehicle_plate}`, 20, 75);
      }
      
      let yPos = 90;
      pdf.setFontSize(10);
      pdf.text("Azonosito", 20, yPos);
      pdf.text("Faj", 60, yPos);
      pdf.text("Osztaly", 90, yPos);
      pdf.text("Suly (kg)", 120, yPos);
      
      yPos += 10;
      
      (items as TransportDocumentItem[])?.forEach((item) => {
        const animal = item.animals;
        pdf.text(animal.animal_id, 20, yPos);
        pdf.text(animal.species, 60, yPos);
        pdf.text(animal.class || "-", 90, yPos);
        pdf.text((animal.weight || 0).toString(), 120, yPos);
        
        yPos += 8;
        
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
      });
      
      yPos += 10;
      pdf.setFontSize(12);
      pdf.text(`Osszes suly: ${doc.total_weight.toFixed(2)} kg`, 20, yPos);
      pdf.text(`Osszes ar: ${Math.round(doc.total_price).toLocaleString("hu-HU")} Ft`, 20, yPos + 10);
      
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
