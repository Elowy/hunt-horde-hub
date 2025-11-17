import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { HandHeart } from "lucide-react";

interface AnimalClaimButtonProps {
  animalId: string;
  animalIdentifier: string;
  onClaimed?: () => void;
}

export const AnimalClaimButton = ({ animalId, animalIdentifier, onClaimed }: AnimalClaimButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Hiba",
          description: "Be kell jelentkezned az igényléshez",
          variant: "destructive",
        });
        return;
      }

      const { error } = await (supabase as any)
        .from("animal_claims")
        .insert({
          animal_id: animalId,
          hunter_id: user.id,
          status: "pending",
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Figyelem",
            description: "Már igényeltél ez az állatot.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Siker!",
        description: `Igénylés sikeresen elküldve a(z) ${animalIdentifier} állatra. Várj az adminisztrátor döntésére.`,
      });

      if (onClaimed) {
        onClaimed();
      }
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
    <Button
      size="sm"
      variant="outline"
      onClick={handleClaim}
      disabled={loading}
      className="gap-2"
    >
      <HandHeart className="h-4 w-4" />
      {loading ? "Igénylés..." : "Igénylek"}
    </Button>
  );
};
