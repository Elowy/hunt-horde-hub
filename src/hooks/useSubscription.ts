import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PRO_PRODUCT_IDS = ["prod_TQMCsYuGXl2cqX", "prod_TQMCzW95I3TlPz"];

export const useSubscription = () => {
  const [loading, setLoading] = useState(true);
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
        setIsPro(lifetimeData.tier === "pro");
        setLoading(false);
        return;
      }

      // Ellenőrizzük a Stripe előfizetéseket
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setProductId(data.product_id);
      setIsPro(data.product_id === "pro" || PRO_PRODUCT_IDS.includes(data.product_id));
    } catch (error) {
      console.error("Error checking subscription:", error);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  return { isPro, loading, productId, checkSubscription };
};
