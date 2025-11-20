import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Loader2, Save, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { HunterFeaturePermissions } from "@/components/HunterFeaturePermissions";
import { EpidemicMeasuresManager } from "@/components/EpidemicMeasuresManager";

interface NotificationSettings {
  notify_on_transport: boolean;
  notify_on_storage_full: boolean;
  notify_on_animal_add: boolean;
  notify_on_animal_update: boolean;
  notify_on_animal_delete: boolean;
  notify_on_registration_approved: boolean;
  notify_on_registration_rejected: boolean;
  notify_on_announcement: boolean;
  notify_on_membership_fee: boolean;
  notify_on_ticket_status_change: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const { isSuperAdmin } = useIsSuperAdmin();
  const [userType, setUserType] = useState<string>("");
  const [enableMembershipDiscount, setEnableMembershipDiscount] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    notify_on_transport: true,
    notify_on_storage_full: true,
    notify_on_animal_add: true,
    notify_on_animal_update: false,
    notify_on_animal_delete: false,
    notify_on_registration_approved: true,
    notify_on_registration_rejected: true,
    notify_on_announcement: true,
    notify_on_membership_fee: true,
    notify_on_ticket_status_change: true,
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

      // Load notification settings
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
          notify_on_announcement: data.notify_on_announcement ?? true,
          notify_on_membership_fee: data.notify_on_membership_fee ?? true,
          notify_on_ticket_status_change: data.notify_on_ticket_status_change ?? true,
        });
      }

      // Load profile settings
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, enable_membership_discount")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserType(profile.user_type || "");
        setEnableMembershipDiscount(profile.enable_membership_discount || false);
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

      // Save notification settings
      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          ...settings,
        });

      if (error) throw error;

      // Save profile settings (membership discount)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          enable_membership_discount: enableMembershipDiscount,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

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

  const sendTestEmail = async (notificationType: string) => {
    try {
      setSendingTest(notificationType);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("Nem található email cím");
      }

      const { error } = await supabase.functions.invoke("send-test-notification", {
        body: {
          notification_type: notificationType,
          user_email: user.email,
        },
      });

      if (error) throw error;

      toast({
        title: "Teszt email elküldve",
        description: `A teszt értesítés el lett küldve a ${user.email} címre`,
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült elküldeni a teszt emailt",
        variant: "destructive",
      });
    } finally {
      setSendingTest(null);
    }
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
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-transport" className="text-base">
                  Elszállítás történt
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés új szállítólevél létrehozásakor a részletes adatokkal
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail("transport")}
                    disabled={sendingTest === "transport"}
                  >
                    {sendingTest === "transport" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Switch
                  id="notify-transport"
                  checked={settings.notify_on_transport}
                  onCheckedChange={(checked) => updateSetting("notify_on_transport", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-storage" className="text-base">
                  Hűtő telítettség 80% felett
                </Label>
                <p className="text-sm text-muted-foreground">
                  Figyelmeztetés amikor egy hűtési hely eléri a 80%-os kapacitást
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail("storage_full")}
                    disabled={sendingTest === "storage_full"}
                  >
                    {sendingTest === "storage_full" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Switch
                  id="notify-storage"
                  checked={settings.notify_on_storage_full}
                  onCheckedChange={(checked) => updateSetting("notify_on_storage_full", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-add" className="text-base">
                  Új vad hozzáadása
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés minden új állat regisztrációjáról
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail("animal_add")}
                    disabled={sendingTest === "animal_add"}
                  >
                    {sendingTest === "animal_add" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Switch
                  id="notify-add"
                  checked={settings.notify_on_animal_add}
                  onCheckedChange={(checked) => updateSetting("notify_on_animal_add", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-update" className="text-base">
                  Vad módosítása
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés állat adatok módosításakor a változásokkal
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail("animal_update")}
                    disabled={sendingTest === "animal_update"}
                  >
                    {sendingTest === "animal_update" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Switch
                  id="notify-update"
                  checked={settings.notify_on_animal_update}
                  onCheckedChange={(checked) => updateSetting("notify_on_animal_update", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-delete" className="text-base">
                  Vad törlése
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés állat törlésekor a törölt adatokkal
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail("animal_delete")}
                    disabled={sendingTest === "animal_delete"}
                  >
                    {sendingTest === "animal_delete" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Switch
                  id="notify-delete"
                  checked={settings.notify_on_animal_delete}
                  onCheckedChange={(checked) => updateSetting("notify_on_animal_delete", checked)}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-approved" className="text-base">
                  Beiratkozás jóváhagyása
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés amikor a beiratkozási kérelme jóváhagyásra kerül
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail("registration_approved")}
                    disabled={sendingTest === "registration_approved"}
                  >
                    {sendingTest === "registration_approved" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Switch
                  id="notify-approved"
                  checked={settings.notify_on_registration_approved}
                  onCheckedChange={(checked) => updateSetting("notify_on_registration_approved", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-rejected" className="text-base">
                  Beiratkozás elutasítása
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés amikor a beiratkozási kérelme elutasításra kerül
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail("registration_rejected")}
                    disabled={sendingTest === "registration_rejected"}
                  >
                    {sendingTest === "registration_rejected" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Switch
                  id="notify-rejected"
                  checked={settings.notify_on_registration_rejected}
                  onCheckedChange={(checked) => updateSetting("notify_on_registration_rejected", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-announcement" className="text-base">
                  Új hírek
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés amikor új hír kerül közzétételre
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestEmail("announcement")}
                    disabled={sendingTest === "announcement"}
                  >
                    {sendingTest === "announcement" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Switch
                  id="notify-announcement"
                  checked={settings.notify_on_announcement}
                  onCheckedChange={(checked) => updateSetting("notify_on_announcement", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-membership-fee" className="text-base">
                  Tagdíj értesítés
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés amikor új tagdíj fizetési kötelezettség kerül kiküldésre
                </p>
              </div>
              <Switch
                id="notify-membership-fee"
                checked={settings.notify_on_membership_fee}
                onCheckedChange={(checked) => updateSetting("notify_on_membership_fee", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notify-ticket-status" className="text-base">
                  Támogatási jegy státusz változás
                </Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés amikor a támogatási jegy státusza megváltozik
                </p>
              </div>
              <Switch
                id="notify-ticket-status"
                checked={settings.notify_on_ticket_status_change}
                onCheckedChange={(checked) => updateSetting("notify_on_ticket_status_change", checked)}
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

        {/* Hunter Feature Permissions - Only for hunter societies */}
        {userType === "hunter_society" && (
          <div className="mt-6">
            <HunterFeaturePermissions />
          </div>
        )}

        {/* Epidemic Measures - Only for hunter societies */}
        {userType === "hunter_society" && (
          <div className="mt-6">
            <EpidemicMeasuresManager />
          </div>
        )}

        {/* Membership Discount Setting - Only for hunter societies */}
        {userType === "hunter_society" && (
          <Card className="mt-6">
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Settings;
