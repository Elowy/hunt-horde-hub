import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type HunterCategory = Database["public"]["Enums"]["hunter_category"];

interface FeaturePermissions {
  allow_registrations: boolean;
  allow_view_statistics: boolean;
  allow_view_announcements: boolean;
}

const HUNTER_CATEGORIES: { value: HunterCategory; label: string }[] = [
  { value: "tag", label: "Tag" },
  { value: "vendeg", label: "Vendég" },
  { value: "bervadasz", label: "Bérvadász" },
  { value: "ib_vendeg", label: "IB Vendég" },
  { value: "trofeas_vadasz", label: "Trófeás Vadász" },
  { value: "egyeb", label: "Egyéb" },
];

export const HunterFeaturePermissions = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<HunterCategory, FeaturePermissions>>({} as any);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load existing permissions
      const { data: existingPermissions } = await supabase
        .from("hunter_feature_permissions")
        .select("*")
        .eq("hunter_society_id", user.id);

      // Initialize permissions with defaults
      const permissionsMap: Record<HunterCategory, FeaturePermissions> = {} as any;
      
      HUNTER_CATEGORIES.forEach(({ value }) => {
        const existing = existingPermissions?.find(p => p.hunter_category === value);
        permissionsMap[value] = existing ? {
          allow_registrations: existing.allow_registrations,
          allow_view_statistics: existing.allow_view_statistics,
          allow_view_announcements: existing.allow_view_announcements,
        } : {
          allow_registrations: true,
          allow_view_statistics: true,
          allow_view_announcements: true,
        };
      });

      setPermissions(permissionsMap);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Hiba történt a jogosultságok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save all permissions
      for (const category of HUNTER_CATEGORIES) {
        const categoryPermissions = permissions[category.value];
        
        const { error } = await supabase
          .from("hunter_feature_permissions")
          .upsert({
            hunter_society_id: user.id,
            hunter_category: category.value,
            ...categoryPermissions,
          }, {
            onConflict: "hunter_society_id,hunter_category"
          });

        if (error) throw error;
      }

      toast.success("Jogosultságok sikeresen mentve");
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Hiba történt a jogosultságok mentésekor");
    } finally {
      setSaving(false);
    }
  };

  const updatePermission = (category: HunterCategory, field: keyof FeaturePermissions, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vadász jogosultságok</CardTitle>
          <CardDescription>Betöltés...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vadász jogosultságok kategóriánként</CardTitle>
        <CardDescription>
          Határozd meg, hogy az egyes vadász kategóriák milyen funkciókat érhetnek el
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {HUNTER_CATEGORIES.map(({ value, label }) => (
          <div key={value} className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">{label}</h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={`${value}-registrations`}>Vadászati beiratkozások</Label>
                <Switch
                  id={`${value}-registrations`}
                  checked={permissions[value]?.allow_registrations ?? true}
                  onCheckedChange={(checked) => updatePermission(value, "allow_registrations", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor={`${value}-statistics`}>Statisztikák megtekintése</Label>
                <Switch
                  id={`${value}-statistics`}
                  checked={permissions[value]?.allow_view_statistics ?? true}
                  onCheckedChange={(checked) => updatePermission(value, "allow_view_statistics", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor={`${value}-announcements`}>Hírek megtekintése</Label>
                <Switch
                  id={`${value}-announcements`}
                  checked={permissions[value]?.allow_view_announcements ?? true}
                  onCheckedChange={(checked) => updatePermission(value, "allow_view_announcements", checked)}
                />
              </div>
            </div>
          </div>
        ))}
        
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mentés...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Mentés
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
