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
import { Truck, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

interface Transporter {
  id: string;
  company_name: string;
  contact_name: string | null;
  address: string | null;
  tax_number: string | null;
}

interface CreateTransportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransporterSelected: (transporterId: string, vehiclePlate: string) => void;
}

export const CreateTransportDialog = ({ 
  open, 
  onOpenChange, 
  onTransporterSelected 
}: CreateTransportDialogProps) => {
  const { toast } = useToast();
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [selectedTransporter, setSelectedTransporter] = useState<string>("");
  const [vehiclePlate, setVehiclePlate] = useState<string>("");
  const [showNewForm, setShowNewForm] = useState(false);
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
      setShowNewForm(false);
      setSelectedTransporter("");
      setVehiclePlate("");
      setFormData({
        companyName: "",
        contactName: "",
        address: "",
        taxNumber: "",
      });
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

  const handleCreateNewTransporter = async () => {
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

      const { data, error } = await supabase
        .from("transporters")
        .insert({
          user_id: user.id,
          company_name: formData.companyName,
          contact_name: formData.contactName || null,
          address: formData.address || null,
          tax_number: formData.taxNumber || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Elszállító hozzáadva!",
      });

      // Automatically select the newly created transporter with empty vehicle plate
      // User will need to provide vehicle plate in the main form
      if (!vehiclePlate.trim()) {
        toast({
          title: "Figyelmeztetés",
          description: "Adja meg a gépjármű rendszámát!",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      onTransporterSelected(data.id, vehiclePlate);
      onOpenChange(false);
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

  const handleSelectExisting = () => {
    if (!selectedTransporter) {
      toast({
        title: "Figyelmeztetés",
        description: "Válasszon ki egy elszállítót!",
        variant: "destructive",
      });
      return;
    }

    if (!vehiclePlate.trim()) {
      toast({
        title: "Figyelmeztetés",
        description: "Adja meg a gépjármű rendszámát!",
        variant: "destructive",
      });
      return;
    }

    onTransporterSelected(selectedTransporter, vehiclePlate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Elszállító kiválasztása</DialogTitle>
          <DialogDescription>
            Válasszon egy meglévő elszállítót vagy hozzon létre újat
          </DialogDescription>
        </DialogHeader>

        {!showNewForm ? (
          <div className="space-y-4">
            {transporters.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label>Válasszon egy meglévő elszállítót:</Label>
                  <RadioGroup value={selectedTransporter} onValueChange={setSelectedTransporter}>
                    {transporters.map((transporter) => (
                      <div key={transporter.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent">
                        <RadioGroupItem value={transporter.id} id={transporter.id} />
                        <Label htmlFor={transporter.id} className="flex-1 cursor-pointer">
                          <div className="font-medium">{transporter.company_name}</div>
                          {transporter.contact_name && (
                            <div className="text-sm text-muted-foreground">{transporter.contact_name}</div>
                          )}
                          {transporter.address && (
                            <div className="text-sm text-muted-foreground">{transporter.address}</div>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate">Gépjármű rendszáma *</Label>
                  <Input
                    id="vehiclePlate"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="ABC-123"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSelectExisting} className="flex-1">
                    <Truck className="h-4 w-4 mr-2" />
                    Kiválasztás és folytatás
                  </Button>
                </div>

                <Separator />
              </>
            )}

            <Button 
              onClick={() => setShowNewForm(true)} 
              variant="outline" 
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Új elszállító hozzáadása
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="newVehiclePlate">Gépjármű rendszáma *</Label>
              <Input
                id="newVehiclePlate"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="ABC-123"
                required
                disabled={loading}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => setShowNewForm(false)} 
                variant="outline"
                disabled={loading}
              >
                Vissza
              </Button>
              <Button 
                onClick={handleCreateNewTransporter}
                disabled={loading}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Hozzáadás és folytatás
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
