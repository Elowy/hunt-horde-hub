import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PRO_PRODUCT_IDS = ["prod_TQMCsYuGXl2cqX", "prod_TQMCzW95I3TlPz"];
const NORMAL_PRODUCT_IDS = ["prod_TQMCKFFwVc6lXT", "prod_TQMCwp0XrDYkOB"];

export type SubscriptionTier = "free" | "normal" | "pro";

export interface SubscriptionLimits {
  maxStorageLocations: number | null; // null = unlimited
  maxAnimals: number | null; // null = unlimited
  maxEditors: number | null; // null = unlimited
  canUseElectronicRegistration: boolean;
  canManageHunters: boolean;
  canSendInvitations: boolean;
  canViewReports: boolean;
  supportLevel: "none" | "medium" | "high";
}

const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxStorageLocations: 1,
    maxAnimals: 100,
    maxEditors: 0,
    canUseElectronicRegistration: false,
    canManageHunters: false,
    canSendInvitations: false,
    canViewReports: false,
    supportLevel: "none",
  },
  normal: {
    maxStorageLocations: null,
    maxAnimals: null,
    maxEditors: 3,
    canUseElectronicRegistration: false,
    canManageHunters: true,
    canSendInvitations: true,
    canViewReports: true,
    supportLevel: "medium",
  },
  pro: {
    maxStorageLocations: null,
    maxAnimals: null,
    maxEditors: null,
    canUseElectronicRegistration: true,
    canManageHunters: true,
    canSendInvitations: true,
    canViewReports: true,
    supportLevel: "high",
  },
};

export const useSubscription = () => {
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [isPro, setIsPro] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsPro(false);
        return;
      }

      // Ellenőrizzük a próbaidőszakot először
      const { data: trialData } = await supabase
        .from("trial_subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (trialData) {
        const expiresAt = new Date(trialData.expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          setProductId("trial_pro");
          setTier("pro"); // Trial is always pro tier
          setIsPro(true);
          setLoading(false);
          return;
        }
      }

      // Ellenőrizzük az örökös előfizetéseket
      const { data: lifetimeData } = await supabase
        .from("lifetime_subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (lifetimeData) {
        setProductId(lifetimeData.tier);
        
        // Determine tier for lifetime subscriptions
        if (lifetimeData.tier === "pro") {
          setTier("pro");
          setIsPro(true);
        } else if (lifetimeData.tier === "normal") {
          setTier("normal");
          setIsPro(false);
        } else {
          setTier("free");
          setIsPro(false);
        }
        
        setLoading(false);
        return;
      }

      // Ellenőrizzük a Stripe előfizetéseket
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setProductId(data.product_id);
      
      // Determine tier based on product_id
      if (data.product_id === "pro" || PRO_PRODUCT_IDS.includes(data.product_id)) {
        setTier("pro");
        setIsPro(true);
      } else if (NORMAL_PRODUCT_IDS.includes(data.product_id)) {
        setTier("normal");
        setIsPro(false);
      } else {
        setTier("free");
        setIsPro(false);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setTier("free");
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  const limits = TIER_LIMITS[tier];

  return { 
    isPro, 
    loading, 
    productId, 
    tier,
    limits,
    checkSubscription 
  };
};
