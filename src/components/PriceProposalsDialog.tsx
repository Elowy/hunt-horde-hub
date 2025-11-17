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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Check, X, Loader2 } from "lucide-react";

interface PriceProposal {
  id: string;
  species: string;
  class: string;
  price_per_kg: number;
  status: string;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  created_at: string;
  buyers: {
    company_name: string;
    contact_name: string | null;
  };
}

export const PriceProposalsDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [proposals, setProposals] = useState<PriceProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchProposals();
    }
  }, [open]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("buyer_price_proposals")
        .select(`
          *,
          buyers!inner (
            company_name,
            contact_name
          )
        `)
        .eq("hunter_society_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(data || []);
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

  const handleAccept = async (proposalId: string) => {
    try {
      setProcessingId(proposalId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("buyer_price_proposals")
        .update({
          status: "accepted",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", proposalId);

      if (error) throw error;

      // Send notification
      try {
        await supabase.functions.invoke("send-price-proposal-notification", {
          body: {
            proposalId,
            type: "proposal_accepted",
          },
        });
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }

      toast({
        title: "Siker",
        description: "Árjavaslat elfogadva",
      });

      fetchProposals();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      setProcessingId(proposalId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("buyer_price_proposals")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", proposalId);

      if (error) throw error;

      toast({
        title: "Siker",
        description: "Árjavaslat elutasítva",
      });

      fetchProposals();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Függőben</Badge>;
      case "accepted":
        return <Badge className="bg-green-500">Elfogadva</Badge>;
      case "rejected":
        return <Badge variant="destructive">Elutasítva</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <FileText className="mr-2 h-4 w-4" />
          Árjavaslatok
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Felvásárlói árjavaslatok</DialogTitle>
          <DialogDescription>
            A felvásárlók által küldött árjavaslatok megtekintése és kezelése
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : proposals.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Még nincsenek árjavaslatok
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <Card key={proposal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {proposal.buyers.company_name}
                      </CardTitle>
                      <CardDescription>
                        {new Date(proposal.created_at).toLocaleDateString("hu-HU")}
                      </CardDescription>
                    </div>
                    {getStatusBadge(proposal.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Faj:</span>
                        <p className="font-medium">{proposal.species}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Osztály:</span>
                        <p className="font-medium">{proposal.class}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ár:</span>
                        <p className="font-medium">
                          {proposal.price_per_kg.toLocaleString("hu-HU")} Ft/kg
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Érvényesség:</span>
                        <p className="font-medium">
                          {new Date(proposal.valid_from).toLocaleDateString("hu-HU")}
                          {proposal.valid_to &&
                            ` - ${new Date(proposal.valid_to).toLocaleDateString("hu-HU")}`}
                        </p>
                      </div>
                    </div>
                    {proposal.notes && (
                      <div className="pt-2">
                        <span className="text-muted-foreground text-sm">
                          Megjegyzés:
                        </span>
                        <p className="text-sm mt-1">{proposal.notes}</p>
                      </div>
                    )}
                    {proposal.status === "pending" && (
                      <div className="flex gap-2 pt-4">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(proposal.id)}
                          disabled={processingId === proposal.id}
                        >
                          {processingId === proposal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Elfogadás
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(proposal.id)}
                          disabled={processingId === proposal.id}
                        >
                          {processingId === proposal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <X className="h-4 w-4 mr-2" />
                          )}
                          Elutasítás
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
