import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Crown } from "lucide-react";

type SubscriptionTier = "free" | "normal" | "pro";

export const SubscriptionTierSwitcher = () => {
  const [activeTier, setActiveTier] = useState<SubscriptionTier>("free");

  useEffect(() => {
    const storedTier = localStorage.getItem("impersonate_subscription_tier") as SubscriptionTier;
    if (storedTier) {
      setActiveTier(storedTier);
    }
  }, []);

  const handleTierChange = (tier: SubscriptionTier) => {
    setActiveTier(tier);
    localStorage.setItem("impersonate_subscription_tier", tier);
    // Frissítjük az oldalt, hogy a változások érvényesüljenek
    window.location.reload();
  };

  return (
    <div className="space-y-2 px-2">
      <Label className="text-xs flex items-center gap-2">
        <Crown className="h-3 w-3" />
        Előfizetési szint váltás (Super Admin)
      </Label>
      <Select value={activeTier} onValueChange={handleTierChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Ingyenes</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export const getActiveSubscriptionTier = (): SubscriptionTier | null => {
  return localStorage.getItem("impersonate_subscription_tier") as SubscriptionTier | null;
};
