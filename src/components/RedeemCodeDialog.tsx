import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Ticket } from "lucide-react";

interface RedeemCodeDialogProps {
  onCodeRedeemed: () => void;
}

export const RedeemCodeDialog = ({ onCodeRedeemed }: RedeemCodeDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: "Hiba",
        description: "Kérem adja meg a kódot!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("redeem_subscription_code", {
        _code: code.toUpperCase().trim(),
      });

      if (error) {
        throw new Error("Érvénytelen vagy már beváltott kód!");
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result) throw new Error("Érvénytelen vagy már beváltott kód!");

      toast({
        title: "Siker!",
        description: `${String(result.tier).toUpperCase()} csomag aktiválva ${result.duration === 'monthly' ? '1 hónapra' : '1 évre'}!`,
      });

      setOpen(false);
      setCode("");
      onCodeRedeemed();
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
        <Button variant="outline">
          <Ticket className="h-4 w-4 mr-2" />
          Kód beváltása
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Előfizetési kód beváltása</DialogTitle>
          <DialogDescription>
            Adja meg az előfizetési kódot az aktiváláshoz.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRedeem}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Kód</Label>
              <Input
                id="code"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={19}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Beváltás..." : "Beváltás"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
