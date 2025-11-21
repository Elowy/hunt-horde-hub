import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { User, Calendar, FileText, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingDeposit {
  id: string;
  user_id: string;
  amount: number;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  profiles?: {
    contact_name: string;
  };
}

interface ApproveDepositsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ApproveDepositsDialog({ open, onOpenChange, onSuccess }: ApproveDepositsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPendingDeposits();
    }
  }, [open]);

  const fetchPendingDeposits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get admin's society ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data: transactions, error } = await supabase
        .from("user_balance_transactions")
        .select("*")
        .eq("hunter_society_id", profile.id)
        .eq("status", "pending")
        .eq("transaction_type", "deposit")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (transactions && transactions.length > 0) {
        const userIds = [...new Set(transactions.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, contact_name")
          .in("id", userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const depositsWithProfiles = transactions.map(t => ({
          ...t,
          profiles: profilesMap.get(t.user_id) || { contact_name: "Ismeretlen" },
        }));

        setDeposits(depositsWithProfiles);
      } else {
        setDeposits([]);
      }
    } catch (error: any) {
      console.error("Error fetching deposits:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a befizetéseket",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (depositId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("user_balance_transactions")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", depositId);

      if (error) throw error;

      toast({
        title: "Befizetés jóváhagyva",
        description: "A befizetés sikeresen jóváhagyásra került.",
      });

      await fetchPendingDeposits();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error approving deposit:", error);
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült jóváhagyni a befizetést",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      toast({
        title: "Hiányzó adat",
        description: "Kérem adja meg az elutasítás okát!",
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
        .update({
          status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", rejectingId);

      if (error) throw error;

      toast({
        title: "Befizetés elutasítva",
        description: "A befizetés elutasításra került.",
      });

      setRejectingId(null);
      setRejectionReason("");
      await fetchPendingDeposits();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error rejecting deposit:", error);
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült elutasítani a befizetést",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (rejectingId) {
    const deposit = deposits.find((d) => d.id === rejectingId);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Befizetés elutasítása</DialogTitle>
            <DialogDescription>
              Vadász: {deposit?.profiles?.contact_name || "N/A"} | Összeg: {deposit?.amount.toLocaleString("hu-HU")} Ft
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Elutasítás oka <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Kérem írja le az elutasítás okát..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectingId(null);
                setRejectionReason("");
              }}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !rejectionReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {loading ? "Elutasítás..." : "Elutasítás"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Befizetések jóváhagyása</DialogTitle>
          <DialogDescription>
            Várakozó befizetések ({deposits.length})
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4">
            {deposits.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nincs jóváhagyásra váró befizetés
              </div>
            ) : (
              deposits.map((deposit) => (
                <Card key={deposit.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {deposit.profiles?.contact_name || "Ismeretlen vadász"}
                        </span>
                      </div>

                      {deposit.reference_number && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Hivatkozás: <span className="font-mono">{deposit.reference_number}</span>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-lg font-bold">
                          {deposit.amount.toLocaleString("hu-HU")} Ft
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Rögzítve: {format(new Date(deposit.created_at), "PPP p", { locale: hu })}
                        </span>
                      </div>

                      {deposit.notes && (
                        <div className="text-sm bg-muted p-3 rounded-md">
                          <p className="text-muted-foreground mb-1">Megjegyzés:</p>
                          <p>{deposit.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleApprove(deposit.id)}
                          disabled={loading}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Jóváhagyás
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setRejectingId(deposit.id)}
                          disabled={loading}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Elutasítás
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
