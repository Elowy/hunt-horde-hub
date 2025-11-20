import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { QRCodeManagement } from "@/components/QRCodeManagement";
import { MembershipFeeSettings } from "@/components/MembershipFeeSettings";
import { HunterFeaturePermissions } from "@/components/HunterFeaturePermissions";
import { EpidemicMeasuresManager } from "@/components/EpidemicMeasuresManager";
import { useToast } from "@/hooks/use-toast";

const HunterSocietySettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [enableMembershipDiscount, setEnableMembershipDiscount] = useState(false);
  const [saving, setSaving] = useState(false);

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

      // Load membership discount setting
      const { data: profile } = await supabase
        .from("profiles")
        .select("enable_membership_discount")
        .eq("id", user.id)
        .single();

      if (profile) {
        setEnableMembershipDiscount(profile.enable_membership_discount || false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMembershipDiscount = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          enable_membership_discount: enableMembershipDiscount,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Sikeres mentés",
        description: "A tagdíj kedvezmény beállítás frissítve lett",
      });
    } catch (error: any) {
      console.error("Error saving setting:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
                Admin beállítások és jogosultság kezelés
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Hunter Feature Permissions */}
        <HunterFeaturePermissions />

        {/* Epidemic Measures */}
        <EpidemicMeasuresManager />

        {/* Membership Discount Setting */}
        <Card>
          <CardHeader>
            <CardTitle>Tagdíj kedvezmény beállítások</CardTitle>
            <CardDescription>
              Engedélyezze, hogy a tagok a tagdíj befizetésük mértékéig kedvezményes áron foglalhassanak állatokat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="enable-discount" className="text-base">
                  Tagdíj alapú kedvezmény engedélyezése
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ha engedélyezve van, a vadászok a tagdíjuk mértékéig 2. osztályú áron, ÁFA nélkül foglalhatnak állatokat
                </p>
              </div>
              <Switch
                id="enable-discount"
                checked={enableMembershipDiscount}
                onCheckedChange={setEnableMembershipDiscount}
              />
            </div>
            <div className="mt-4">
              <Button
                onClick={handleSaveMembershipDiscount}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  "Beállítás mentése"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Management */}
        <QRCodeManagement />

        {/* Membership Fee Settings */}
        <MembershipFeeSettings />
      </div>
    </div>
  );
};

export default HunterSocietySettings;
