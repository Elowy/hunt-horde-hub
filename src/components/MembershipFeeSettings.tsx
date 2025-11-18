import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Save } from "lucide-react";

interface MembershipFeeSetting {
  id: string;
  season_year: number;
  first_half_amount: number;
  second_half_amount: number;
  full_year_amount: number;
  notes: string | null;
}

export const MembershipFeeSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentSeasonYear, setCurrentSeasonYear] = useState(0);
  const [settings, setSettings] = useState<MembershipFeeSetting | null>(null);
  const [firstHalfAmount, setFirstHalfAmount] = useState("");
  const [secondHalfAmount, setSecondHalfAmount] = useState("");
  const [fullYearAmount, setFullYearAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Calculate current season year (March 1 - Feb 28/29)
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // If we're in Jan-Feb, we're in the previous season
    const seasonYear = currentMonth <= 2 ? currentYear - 1 : currentYear;
    setCurrentSeasonYear(seasonYear);
    
    fetchSettings(seasonYear);
  }, []);

  const fetchSettings = async (seasonYear: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("membership_fee_settings")
        .select("*")
        .eq("hunter_society_id", user.id)
        .eq("season_year", seasonYear)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings(data);
        setFirstHalfAmount(data.first_half_amount.toString());
        setSecondHalfAmount(data.second_half_amount.toString());
        setFullYearAmount(data.full_year_amount.toString());
        setNotes(data.notes || "");
      } else {
        // Set defaults
        setFirstHalfAmount("0");
        setSecondHalfAmount("0");
        setFullYearAmount("0");
        setNotes("");
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const payload = {
        hunter_society_id: user.id,
        season_year: currentSeasonYear,
        first_half_amount: parseFloat(firstHalfAmount) || 0,
        second_half_amount: parseFloat(secondHalfAmount) || 0,
        full_year_amount: parseFloat(fullYearAmount) || 0,
        notes: notes || null,
      };

      const { error } = await supabase
        .from("membership_fee_settings")
        .upsert(payload, {
          onConflict: "hunter_society_id,season_year"
        });

      if (error) throw error;

      toast({
        title: "Sikeres mentés",
        description: "A tagdíj beállítások sikeresen mentésre kerültek.",
      });

      fetchSettings(currentSeasonYear);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Tagdíj beállítások
        </CardTitle>
        <CardDescription>
          {currentSeasonYear}/{currentSeasonYear + 1} vadászati idény tagdíjai
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstHalf">
            Első félév összege (március 1 - augusztus 31) - Ft
          </Label>
          <Input
            id="firstHalf"
            type="number"
            min="0"
            step="100"
            value={firstHalfAmount}
            onChange={(e) => setFirstHalfAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondHalf">
            Második félév összege (szeptember 1 - február utolsó nap) - Ft
          </Label>
          <Input
            id="secondHalf"
            type="number"
            min="0"
            step="100"
            value={secondHalfAmount}
            onChange={(e) => setSecondHalfAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullYear">
            Egész éves összeg - Ft
          </Label>
          <Input
            id="fullYear"
            type="number"
            min="0"
            step="100"
            value={fullYearAmount}
            onChange={(e) => setFullYearAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Megjegyzések</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcionális megjegyzések a tagdíjakról"
            rows={3}
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Mentés..." : "Beállítások mentése"}
        </Button>
      </CardContent>
    </Card>
  );
};
