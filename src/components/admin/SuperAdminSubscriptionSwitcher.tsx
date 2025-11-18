import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type SubscriptionTier = "free" | "normal" | "pro";

export const SuperAdminSubscriptionSwitcher = () => {
  const [activeTier, setActiveTier] = useState<SubscriptionTier>("free");

  useEffect(() => {
    const storedTier = localStorage.getItem("test_subscription_tier") as SubscriptionTier;
    if (storedTier) {
      setActiveTier(storedTier);
    }
  }, []);

  const handleTierChange = (tier: SubscriptionTier) => {
    setActiveTier(tier);
    localStorage.setItem("test_subscription_tier", tier);
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Előfizetési szint tesztelés
        </CardTitle>
        <CardDescription>
          UI tesztelés céljából válthat előfizetési szintek között. A valódi előfizetés továbbra is érvényes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ez csak UI tesztelési célokat szolgál. A fizetés és előfizetési limitek változatlanok maradnak.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Label>Teszt előfizetési szint</Label>
          <Select value={activeTier} onValueChange={handleTierChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Ingyenes (UI teszt)</SelectItem>
              <SelectItem value="normal">Normal (UI teszt)</SelectItem>
              <SelectItem value="pro">Pro (UI teszt)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export const getTestSubscriptionTier = (): SubscriptionTier | null => {
  return localStorage.getItem("test_subscription_tier") as SubscriptionTier | null;
};
