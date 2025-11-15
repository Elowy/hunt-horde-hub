import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useIsSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .single();

      setIsSuperAdmin(!!roles);
    } catch (error) {
      console.error("Error checking super admin status:", error);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { isSuperAdmin, loading };
};
