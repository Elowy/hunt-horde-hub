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

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error("Error checking subscription:", error);
        setIsPro(false);
        return;
      }

      setProductId(data.product_id);
      setIsPro(PRO_PRODUCT_IDS.includes(data.product_id));
    } catch (error) {
      console.error("Error checking subscription:", error);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  return { isPro, loading, productId, checkSubscription };
};
