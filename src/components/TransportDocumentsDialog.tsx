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
import { FileText, Search, Eye, Trash2 } from "lucide-react";
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

export const TransportDocumentsDialog = () => {
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

      const { data, error } = await supabase
        .from("transport_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("transport_date", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
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
      // Lekérjük az elszállító tételeit
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
      pdf.text(`Bizonylat szam: ${doc.document_number}`, 20, 35);
      pdf.text(`Datum: ${new Date(doc.transport_date).toLocaleDateString("hu-HU")}`, 20, 45);
      
      let yPos = 60;
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
        title: "Siker!",
        description: "Elszállító PDF letöltve!",
      });
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Biztosan törli ezt az elszállítót?")) return;

    try {
      const { error } = await supabase
        .from("transport_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Elszállító törölve!",
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.document_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Elszállítók
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Elszállító bizonylatok</DialogTitle>
          <DialogDescription>
            Korábbi elszállítók megtekintése és letöltése
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés bizonylat szám alapján..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Betöltés...</div>
        ) : filteredDocuments.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Még nincs elszállító bizonylat.
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bizonylat szám</TableHead>
                <TableHead>Dátum</TableHead>
                <TableHead>Állatok száma</TableHead>
                <TableHead>Összes súly</TableHead>
                <TableHead>Összes ár</TableHead>
                <TableHead className="text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.document_number}</TableCell>
                  <TableCell>
                    {new Date(doc.transport_date).toLocaleDateString("hu-HU")}
                  </TableCell>
                  <TableCell>{doc.animal_count} db</TableCell>
                  <TableCell>{doc.total_weight.toFixed(2)} kg</TableCell>
                  <TableCell>{Math.round(doc.total_price).toLocaleString("hu-HU")} Ft</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};
