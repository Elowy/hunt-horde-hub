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
import { Label } from "@/components/ui/label";
import { Truck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EditTransporterDialog } from "@/components/EditTransporterDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

interface Transporter {
  id: string;
  company_name: string;
  contact_name: string | null;
  address: string | null;
  tax_number: string | null;
}

export const TransporterDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    address: "",
    taxNumber: "",
  });

  useEffect(() => {
    if (open) {
      fetchTransporters();
    }
  }, [open]);

  const fetchTransporters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transporters")
        .select("*")
        .eq("user_id", user.id)
        .order("company_name", { ascending: true });

      if (error) throw error;
      setTransporters(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName.trim()) {
      toast({
        title: "Hiba",
        description: "A cég neve kötelező!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("transporters")
        .insert({
          user_id: user.id,
          company_name: formData.companyName,
          contact_name: formData.contactName || null,
          address: formData.address || null,
          tax_number: formData.taxNumber || null,
        });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Elszállító hozzáadva!",
      });

      setFormData({
        companyName: "",
        contactName: "",
        address: "",
        taxNumber: "",
      });

      fetchTransporters();
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

  const handleDelete = async (id: string) => {
    if (!confirm("Biztosan törli ezt az elszállítót?")) return;

    try {
      const { error } = await supabase
        .from("transporters")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Elszállító törölve!",
      });

      fetchTransporters();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Truck className="mr-2 h-4 w-4" />
          Elszállítók
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Elszállító cégek kezelése</DialogTitle>
          <DialogDescription>
            Rögzítse az elszállító cégek adatait
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 border-b pb-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Cég neve *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Elszállító Kft."
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Kapcsolattartó</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Kovács János"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Cím</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Budapest, Fő utca 1."
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxNumber">Adószám</Label>
              <Input
                id="taxNumber"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                placeholder="12345678-1-23"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Hozzáadás..." : "Elszállító hozzáadása"}
            </Button>
          </div>
        </form>

        {transporters.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Még nincs rögzített elszállító.
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cég neve</TableHead>
                <TableHead>Kapcsolattartó</TableHead>
                <TableHead>Cím</TableHead>
                <TableHead>Adószám</TableHead>
                <TableHead className="text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transporters.map((transporter) => (
                <TableRow key={transporter.id}>
                  <TableCell className="font-medium">{transporter.company_name}</TableCell>
                  <TableCell>{transporter.contact_name || "-"}</TableCell>
                  <TableCell>{transporter.address || "-"}</TableCell>
                  <TableCell>{transporter.tax_number || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EditTransporterDialog 
                        transporter={transporter}
                        onTransporterUpdated={fetchTransporters}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transporter.id)}
                        className="h-8 w-8"
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
