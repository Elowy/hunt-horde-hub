import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Transporter {
  id: string;
  company_name: string;
  contact_name: string | null;
  address: string | null;
  tax_number: string | null;
}

interface EditTransporterDialogProps {
  transporter: Transporter;
  onTransporterUpdated: () => void;
}

export const EditTransporterDialog = ({ transporter, onTransporterUpdated }: EditTransporterDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: transporter.company_name,
    contactName: transporter.contact_name || "",
    address: transporter.address || "",
    taxNumber: transporter.tax_number || "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        companyName: transporter.company_name,
        contactName: transporter.contact_name || "",
        address: transporter.address || "",
        taxNumber: transporter.tax_number || "",
      });
    }
  }, [open, transporter]);

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

    const confirmMessage = `Biztosan módosítja a(z) "${transporter.company_name}" elszállítót?`;
    if (!confirm(confirmMessage)) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("transporters")
        .update({
          company_name: formData.companyName,
          contact_name: formData.contactName || null,
          address: formData.address || null,
          tax_number: formData.taxNumber || null,
        })
        .eq("id", transporter.id);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Elszállító frissítve!",
      });

      setOpen(false);
      onTransporterUpdated();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-8 w-8"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Elszállító módosítása</DialogTitle>
          <DialogDescription>
            Módosítsa az elszállító adatait
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="contactName">Kapcsolattartó neve</Label>
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
              placeholder="1234 Budapest, Példa utca 1."
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mentés..." : "Mentés"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
