import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { QRCodeManagement } from "@/components/QRCodeManagement";
import { MembershipFeeSettings } from "@/components/MembershipFeeSettings";

const HunterSocietySettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user has admin, editor, or super_admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasPermission = roles?.some(
        (r) => r.role === "admin" || r.role === "editor" || r.role === "super_admin"
      );

      if (!hasPermission) {
        navigate("/dashboard");
        return;
      }

      setHasAccess(true);
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-forest-deep to-forest-light text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="shrink-0 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Vadásztársaság beállítások</h1>
              <p className="text-white/80 text-sm">
                QR kód kezelés és tagdíj beállítások
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* QR Code Management */}
        <QRCodeManagement />

        {/* Membership Fee Settings */}
        <MembershipFeeSettings />
      </div>
    </div>
  );
};

export default HunterSocietySettings;
