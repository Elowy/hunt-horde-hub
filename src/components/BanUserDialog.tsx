import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BanUserDialogProps {
  userId: string;
  userEmail: string;
  currentBanUntil?: string | null;
  currentBanReason?: string | null;
  onBanUpdated: () => void;
}

export const BanUserDialog = ({ 
  userId, 
  userEmail, 
  currentBanUntil,
  currentBanReason,
  onBanUpdated 
}: BanUserDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banDuration, setBanDuration] = useState<string>("");
  const [banReason, setBanReason] = useState(currentBanReason || "");

  const isCurrentlyBanned = currentBanUntil && new Date(currentBanUntil) > new Date();

  const calculateBanUntil = (duration: string): string | null => {
    const now = new Date();
    switch (duration) {
      case "1month":
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      case "3months":
        return new Date(now.setMonth(now.getMonth() + 3)).toISOString();
      case "6months":
        return new Date(now.setMonth(now.getMonth() + 6)).toISOString();
      case "1year":
        return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      case "permanent":
        return new Date("2100-01-01").toISOString();
      case "unban":
        return null;
      default:
        return null;
    }
  };

  const handleBanUser = async () => {
    if (!banDuration) {
      toast({
        title: "Hiba",
        description: "Kérjük, válasszon egy időtartamot!",
        variant: "destructive",
      });
      return;
    }

    if (banDuration !== "unban" && !banReason.trim()) {
      toast({
        title: "Hiba",
        description: "Kérjük, adjon meg egy indoklást a kitiltáshoz!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const bannedUntil = calculateBanUntil(banDuration);

      const { error } = await supabase
        .from("profiles")
        .update({
          banned_until: bannedUntil,
          ban_reason: banDuration === "unban" ? null : banReason,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Siker",
        description: banDuration === "unban" 
          ? "A felhasználó kitiltása feloldva."
          : "A felhasználó sikeresen kitiltva.",
      });

      setOpen(false);
      setBanDuration("");
      setBanReason("");
      onBanUpdated();
    } catch (error: any) {
      console.error("Error banning user:", error);
      toast({
        title: "Hiba",
        description: error.message || "Hiba történt a kitiltás során.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isCurrentlyBanned ? "outline" : "destructive"}
          size="sm"
        >
          <Ban className="h-4 w-4 mr-2" />
          {isCurrentlyBanned ? "Kitiltás módosítása" : "Kitiltás"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCurrentlyBanned ? "Kitiltás módosítása" : "Felhasználó kitiltása"}
          </DialogTitle>
          <DialogDescription>
            Felhasználó: <strong>{userEmail}</strong>
            {isCurrentlyBanned && (
              <div className="mt-2 p-2 bg-destructive/10 rounded">
                <p className="text-sm text-destructive font-semibold">
                  Jelenleg kitiltva: {new Date(currentBanUntil!).toLocaleDateString()}
                </p>
                {currentBanReason && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Indok: {currentBanReason}
                  </p>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Kitiltás időtartama</Label>
            <Select value={banDuration} onValueChange={setBanDuration}>
              <SelectTrigger id="duration">
                <SelectValue placeholder="Válasszon időtartamot" />
              </SelectTrigger>
              <SelectContent>
                {isCurrentlyBanned && (
                  <SelectItem value="unban">Kitiltás feloldása</SelectItem>
                )}
                <SelectItem value="1month">1 hónap</SelectItem>
                <SelectItem value="3months">3 hónap</SelectItem>
                <SelectItem value="6months">6 hónap</SelectItem>
                <SelectItem value="1year">1 év</SelectItem>
                <SelectItem value="permanent">Örökre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {banDuration !== "unban" && (
            <div className="space-y-2">
              <Label htmlFor="reason">Kitiltás indoka</Label>
              <Textarea
                id="reason"
                placeholder="Adja meg a kitiltás indokát..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Mégse
          </Button>
          <Button
            onClick={handleBanUser}
            disabled={loading}
            variant={banDuration === "unban" ? "default" : "destructive"}
          >
            {loading ? "Feldolgozás..." : banDuration === "unban" ? "Feloldás" : "Kitiltás"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
