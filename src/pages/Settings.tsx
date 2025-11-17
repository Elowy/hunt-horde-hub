import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Loader2, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface NotificationSettings {
  notify_on_transport: boolean;
  notify_on_storage_full: boolean;
  notify_on_animal_add: boolean;
  notify_on_animal_update: boolean;
  notify_on_animal_delete: boolean;
  notify_on_registration_approved: boolean;
  notify_on_registration_rejected: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_on_transport: true,
    notify_on_storage_full: true,
    notify_on_animal_add: true,
    notify_on_animal_update: false,
    notify_on_animal_delete: false,
    notify_on_registration_approved: true,
    notify_on_registration_rejected: true,
  });

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings({
          notify_on_transport: data.notify_on_transport,
          notify_on_storage_full: data.notify_on_storage_full,
          notify_on_animal_add: data.notify_on_animal_add,
          notify_on_animal_update: data.notify_on_animal_update,
          notify_on_animal_delete: data.notify_on_animal_delete,
          notify_on_registration_approved: data.notify_on_registration_approved ?? true,
          notify_on_registration_rejected: data.notify_on_registration_rejected ?? true,
        });
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a beállításokat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          ...settings,
        });

      if (error) throw error;

      toast({
        title: "Sikeres mentés",
        description: "Az értesítési beállítások frissítve lettek",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Vissza
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Beállítások</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Email értesítések
            </CardTitle>
            <CardDescription>
              Állítsa be, hogy milyen eseményekről szeretne email értesítést kapni.
              Az email-ek tartalmazzák a részletes adatokat és az IP címet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-transport" className="text-base">
                  Elszállítás történt
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés új szállítólevél létrehozásakor a részletes adatokkal
                </p>
              </div>
              <Switch
                id="notify-transport"
                checked={settings.notify_on_transport}
                onCheckedChange={(checked) => updateSetting("notify_on_transport", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-storage" className="text-base">
                  Hűtő telítettség 80% felett
                </Label>
                <p className="text-sm text-muted-foreground">
                  Figyelmeztetés amikor egy hűtési hely eléri a 80%-os kapacitást
                </p>
              </div>
              <Switch
                id="notify-storage"
                checked={settings.notify_on_storage_full}
                onCheckedChange={(checked) => updateSetting("notify_on_storage_full", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-add" className="text-base">
                  Új vad hozzáadása
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés minden új állat regisztrációjáról
                </p>
              </div>
              <Switch
                id="notify-add"
                checked={settings.notify_on_animal_add}
                onCheckedChange={(checked) => updateSetting("notify_on_animal_add", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-update" className="text-base">
                  Vad módosítása
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés állat adatok módosításakor a változásokkal
                </p>
              </div>
              <Switch
                id="notify-update"
                checked={settings.notify_on_animal_update}
                onCheckedChange={(checked) => updateSetting("notify_on_animal_update", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-delete" className="text-base">
                  Vad törlése
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés állat törlésekor a törölt adatokkal
                </p>
              </div>
              <Switch
                id="notify-delete"
                checked={settings.notify_on_animal_delete}
                onCheckedChange={(checked) => updateSetting("notify_on_animal_delete", checked)}
              />
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-approved" className="text-base">
                  Beiratkozás jóváhagyása
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés amikor a beiratkozási kérelme jóváhagyásra kerül
                </p>
              </div>
              <Switch
                id="notify-approved"
                checked={settings.notify_on_registration_approved}
                onCheckedChange={(checked) => updateSetting("notify_on_registration_approved", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-rejected" className="text-base">
                  Beiratkozás elutasítása
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés amikor a beiratkozási kérelme elutasításra kerül
                </p>
              </div>
              <Switch
                id="notify-rejected"
                checked={settings.notify_on_registration_rejected}
                onCheckedChange={(checked) => updateSetting("notify_on_registration_rejected", checked)}
              />
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Beállítások mentése
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
