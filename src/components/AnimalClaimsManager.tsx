import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Clock } from "lucide-react";

interface AnimalClaim {
  id: string;
  animal_id: string;
  hunter_id: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  animals: {
    animal_id: string;
    species: string;
    weight: number | null;
    storage_locations: {
      name: string;
    };
  };
  profiles: {
    contact_name: string | null;
    contact_email: string | null;
  };
}

export const AnimalClaimsManager = () => {
  const { toast } = useToast();
  const [claims, setClaims] = useState<AnimalClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<AnimalClaim | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("animal_claims")
        .select(`
          *,
          animals!inner(
            animal_id,
            species,
            weight,
            storage_locations!inner(name)
          ),
          profiles!animal_claims_hunter_id_fkey(
            contact_name,
            contact_email
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az állatigényeket: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessClaim = async (claimId: string, status: "approved" | "rejected") => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nem vagy bejelentkezve");

      const { error } = await (supabase as any)
        .from("animal_claims")
        .update({
          status,
          admin_note: adminNote || null,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", claimId);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: `Állatigény ${status === "approved" ? "elfogadva" : "elutasítva"}.`,
      });

      setSelectedClaim(null);
      setAdminNote("");
      fetchClaims();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Függőben lévő állatigények
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  if (claims.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Függőben lévő állatigények
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Jelenleg nincsenek függőben lévő igények.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Függőben lévő állatigények ({claims.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {claim.profiles?.contact_name || claim.profiles?.contact_email || "Ismeretlen vadász"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span className="font-semibold">{claim.animals.animal_id}</span> • {claim.animals.species}
                    {claim.animals.weight && ` • ${claim.animals.weight} kg`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Hűtő: {claim.animals.storage_locations.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(claim.created_at).toLocaleString("hu-HU")}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setSelectedClaim(claim)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Elfogad
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedClaim(claim);
                      setAdminNote("");
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Elutasít
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Állatigény feldolgozása</DialogTitle>
            <DialogDescription>
              {selectedClaim && (
                <>
                  Vadász: {selectedClaim.profiles?.contact_name || selectedClaim.profiles?.contact_email}
                  <br />
                  Állat: {selectedClaim.animals.animal_id} ({selectedClaim.animals.species})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-note">Megjegyzés (opcionális)</Label>
              <Textarea
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Írj megjegyzést..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedClaim(null)}
                disabled={processing}
              >
                Mégse
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedClaim && handleProcessClaim(selectedClaim.id, "rejected")}
                disabled={processing}
              >
                <X className="h-4 w-4 mr-1" />
                Elutasít
              </Button>
              <Button
                onClick={() => selectedClaim && handleProcessClaim(selectedClaim.id, "approved")}
                disabled={processing}
              >
                <Check className="h-4 w-4 mr-1" />
                Elfogad
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
