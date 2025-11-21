import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface Society {
  id: string;
  company_name: string;
}

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  societies: Society[];
  onSuccess?: () => void;
}

export function DepositDialog({ open, onOpenChange, societies, onSuccess }: DepositDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSociety || !referenceNumber || !amount) {
      toast({
        title: "Hiányzó adatok",
        description: "Kérem töltse ki az összes kötelező mezőt!",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Hibás összeg",
        description: "Kérem adjon meg egy érvényes összeget!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("user_balance_transactions")
        .insert({
          user_id: user.id,
          hunter_society_id: selectedSociety,
          transaction_type: "deposit",
          amount: amountNum,
          reference_number: referenceNumber,
          notes: notes || null,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Befizetés rögzítve",
        description: "A befizetés adminisztrátori jóváhagyásra vár.",
      });

      // Reset form
      setSelectedSociety("");
      setReferenceNumber("");
      setAmount("");
      setNotes("");
      onOpenChange(false);
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error creating deposit:", error);
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült rögzíteni a befizetést",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Befizetés rögzítése</DialogTitle>
            <DialogDescription>
              Adja meg a befizetés részleteit. A befizetés adminisztrátori jóváhagyásra vár.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="society">
                Vadásztársaság <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedSociety} onValueChange={setSelectedSociety}>
                <SelectTrigger id="society">
                  <SelectValue placeholder="Válasszon vadásztársaságot" />
                </SelectTrigger>
                <SelectContent>
                  {societies.map((society) => (
                    <SelectItem key={society.id} value={society.id}>
                      {society.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">
                Hivatkozási szám <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reference"
                placeholder="pl. UTAL-2025-001234"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Átutalás közleménye vagy sorszáma
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Befizetett összeg (Ft) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Megjegyzés</Label>
              <Textarea
                id="notes"
                placeholder="Opcionális megjegyzés..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                A befizetés adminisztrátori jóváhagyásra vár. Az egyenlege csak a jóváhagyás után növekszik.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Rögzítés..." : "Befizetés rögzítése"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
