import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, DollarSign } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export const PriceProposalsManagement = () => {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<PriceProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<PriceProposal | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("buyer_price_proposals")
        .select(`
          *,
          buyers (
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
        description: "Nem sikerült betölteni az árjavaslatokat.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (proposal: PriceProposal, action: 'accept' | 'reject') => {
    setSelectedProposal(proposal);
    setActionType(action);
  };

  const confirmAction = async () => {
    if (!selectedProposal || !actionType) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newStatus = actionType === 'accept' ? 'accepted' : 'rejected';

      const { error } = await supabase
        .from("buyer_price_proposals")
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedProposal.id);

      if (error) throw error;

      // Send email notification if accepted
      if (actionType === 'accept') {
        try {
          await supabase.functions.invoke("send-price-proposal-notification", {
            body: {
              proposalId: selectedProposal.id,
              type: "proposal_accepted",
            },
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      toast({
        title: actionType === 'accept' ? "Árjavaslat elfogadva" : "Árjavaslat elutasítva",
        description: `Az árjavaslat sikeresen ${actionType === 'accept' ? 'elfogadva' : 'elutasítva'}.`,
      });

      fetchProposals();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSelectedProposal(null);
      setActionType(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Függőben</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500">Elfogadva</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Elutasítva</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Betöltés...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Árjavaslatok</CardTitle>
          </div>
          <CardDescription>
            Felvásárlók által küldött egyedi árjavaslatok
          </CardDescription>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Még nincsenek árjavaslatok
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Felvásárló</TableHead>
                  <TableHead>Vadfaj</TableHead>
                  <TableHead>Osztály</TableHead>
                  <TableHead>Ár (Ft/kg)</TableHead>
                  <TableHead>Érvényesség</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{proposal.buyers.company_name}</div>
                        {proposal.buyers.contact_name && (
                          <div className="text-sm text-muted-foreground">
                            {proposal.buyers.contact_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{proposal.species}</TableCell>
                    <TableCell>{proposal.class}</TableCell>
                    <TableCell className="font-medium">
                      {proposal.price_per_kg.toLocaleString()} Ft
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(proposal.valid_from).toLocaleDateString()}
                        {proposal.valid_to && (
                          <> - {new Date(proposal.valid_to).toLocaleDateString()}</>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                    <TableCell className="text-right">
                      {proposal.status === 'pending' && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleAction(proposal, 'accept')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Elfogad
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleAction(proposal, 'reject')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Elutasít
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedProposal && !!actionType} onOpenChange={() => {
        setSelectedProposal(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'accept' ? 'Árjavaslat elfogadása' : 'Árjavaslat elutasítása'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'accept' 
                ? 'Biztosan elfogadja ezt az árjavaslat? Ez után a felvásárló értesítést kap.'
                : 'Biztosan elutasítja ezt az árjavaslat?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {actionType === 'accept' ? 'Elfogad' : 'Elutasít'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};