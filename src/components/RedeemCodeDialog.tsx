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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      // Check if code exists and is valid
      const { data: codeData, error: fetchError } = await supabase
        .from("subscription_codes")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .is("redeemed_by", null)
        .single();

      if (fetchError || !codeData) {
        throw new Error("Érvénytelen vagy már beváltott kód!");
      }

      const expiresAt = new Date(codeData.expires_at);
      const now = new Date();

      if (expiresAt < now) {
        throw new Error("Ez a kód már lejárt!");
      }

      // Calculate subscription end date based on duration
      const subscriptionEnd = new Date();
      if (codeData.duration === "monthly") {
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      } else if (codeData.duration === "yearly") {
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      }

      // Mark code as redeemed
      const { error: updateError } = await supabase
        .from("subscription_codes")
        .update({
          redeemed_by: user.id,
          redeemed_at: now.toISOString(),
        })
        .eq("code", code.toUpperCase().trim())
        .is("redeemed_by", null);

      if (updateError) throw updateError;

      // Create trial subscription (or extend existing)
      const { error: subscriptionError } = await supabase
        .from("trial_subscriptions")
        .insert({
          user_id: user.id,
          tier: codeData.tier,
          expires_at: subscriptionEnd.toISOString(),
          newsletter_subscribed: false,
        });

      if (subscriptionError) {
        // If trial already exists, we could update it instead
        console.error("Error creating subscription:", subscriptionError);
      }

      toast({
        title: "Siker!",
        description: `${codeData.tier.toUpperCase()} csomag aktiválva ${codeData.duration === 'monthly' ? '1 hónapra' : '1 évre'}!`,
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
