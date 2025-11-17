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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HunterSociety {
  id: string;
  company_name: string;
}

export const BuyerPriceProposalDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hunterSocieties, setHunterSocieties] = useState<HunterSociety[]>([]);
  const [buyerId, setBuyerId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    hunterSocietyId: "",
    species: "",
    class: "",
    pricePerKg: "",
    validFrom: new Date().toISOString().split('T')[0],
    validTo: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchHunterSocieties();
      fetchBuyerId();
    }
  }, [open]);

  const fetchBuyerId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: buyer } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (buyer) {
        setBuyerId(buyer.id);
      }
    } catch (error: any) {
      console.error("Error fetching buyer:", error);
    }
  };

  const fetchHunterSocieties = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, company_name")
        .eq("user_type", "hunter_society")
        .order("company_name");

      if (error) throw error;
      setHunterSocieties(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a vadásztársaságokat.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!buyerId) {
      toast({
        title: "Hiba",
        description: "Nincs felvásárló profil létrehozva.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: proposal, error } = await supabase
        .from("buyer_price_proposals")
        .insert({
          buyer_id: buyerId,
          hunter_society_id: formData.hunterSocietyId,
          species: formData.species,
          class: formData.class,
          price_per_kg: parseFloat(formData.pricePerKg),
          valid_from: formData.validFrom,
          valid_to: formData.validTo || null,
          notes: formData.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke("send-price-proposal-notification", {
          body: {
            proposalId: proposal.id,
            type: "new_proposal",
          },
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Árjavaslat elküldve",
        description: "Az árjavaslat sikeresen elküldve a vadásztársaságnak.",
      });

      setFormData({
        hunterSocietyId: "",
        species: "",
        class: "",
        pricePerKg: "",
        validFrom: new Date().toISOString().split('T')[0],
        validTo: "",
        notes: "",
      });

      setOpen(false);
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
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <DollarSign className="mr-2 h-4 w-4" />
          Árjavaslat küldése
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Árjavaslat küldése vadásztársaságnak</DialogTitle>
          <DialogDescription>
            Küldjön egyedi árjavaslat egy adott vadásztársaságnak
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hunterSociety">Vadásztársaság *</Label>
            <Select
              value={formData.hunterSocietyId}
              onValueChange={(value) => handleInputChange("hunterSocietyId", value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Válasszon vadásztársaságot" />
              </SelectTrigger>
              <SelectContent>
                {hunterSocieties.map((society) => (
                  <SelectItem key={society.id} value={society.id}>
                    {society.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="species">Vadfaj *</Label>
              <Select
                value={formData.species}
                onValueChange={(value) => handleInputChange("species", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon vadfajt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="🐗 Vaddisznó">🐗 Vaddisznó</SelectItem>
                  <SelectItem value="🦌 Gímszarvas">🦌 Gímszarvas</SelectItem>
                  <SelectItem value="🦌 Dámvad">🦌 Dámvad</SelectItem>
                  <SelectItem value="🦌 Őz">🦌 Őz</SelectItem>
                  <SelectItem value="🦌 Muflon">🦌 Muflon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Osztály *</Label>
              <Select
                value={formData.class}
                onValueChange={(value) => handleInputChange("class", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon osztályt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="I.">I.</SelectItem>
                  <SelectItem value="II.">II.</SelectItem>
                  <SelectItem value="III.">III.</SelectItem>
                  <SelectItem value="Selejt">Selejt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricePerKg">Ár (Ft/kg) *</Label>
            <Input
              id="pricePerKg"
              type="number"
              step="0.01"
              value={formData.pricePerKg}
              onChange={(e) => handleInputChange("pricePerKg", e.target.value)}
              placeholder="pl. 1200"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Érvényes-től *</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => handleInputChange("validFrom", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="validTo">Érvényes-ig</Label>
              <Input
                id="validTo"
                type="date"
                value={formData.validTo}
                onChange={(e) => handleInputChange("validTo", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Megjegyzés</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="További információk az árjavaslatról"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Küldés..." : "Árjavaslat küldése"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};