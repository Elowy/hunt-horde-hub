import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InviteUserDialog } from "@/components/InviteUserDialog";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    taxNumber: "",
  });
  const [passwordData, setPasswordData] = useState({
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  useEffect(() => {
    fetchProfileData();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!roles);
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      setEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        setFormData({
          companyName: profile.company_name || "",
          contactName: profile.contact_name || "",
          contactEmail: profile.contact_email || "",
          contactPhone: profile.contact_phone || "",
          address: profile.address || "",
          taxNumber: profile.tax_number || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: formData.companyName || null,
          contact_name: formData.contactName || null,
          contact_email: formData.contactEmail || null,
          contact_phone: formData.contactPhone || null,
          address: formData.address || null,
          tax_number: formData.taxNumber || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Profil adatok frissítve!",
      });
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setSendingCode(true);
    try {
      const { error } = await supabase.functions.invoke("send-password-reset-code", {
        body: { email },
      });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Ellenőrző kód elküldve az email címére!",
      });

      setCodeSent(true);
    } catch (error: any) {
      console.error("Error sending code:", error);
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült elküldeni a kódot.",
        variant: "destructive",
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.code.trim()) {
      toast({
        title: "Hiba",
        description: "Adja meg az ellenőrző kódot!",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Hiba",
        description: "A jelszavak nem egyeznek!",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Hiba",
        description: "A jelszónak legalább 6 karakter hosszúnak kell lennie!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verify code
      if (user.user_metadata?.password_reset_code !== passwordData.code) {
        throw new Error("Hibás ellenőrző kód!");
      }

      // Check if code expired
      const expiresAt = new Date(user.user_metadata?.password_reset_expires);
      if (expiresAt < new Date()) {
        throw new Error("Az ellenőrző kód lejárt!");
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      // Clear the code
      await supabase.auth.updateUser({
        data: {
          password_reset_code: null,
          password_reset_expires: null,
        },
      });

      toast({
        title: "Siker!",
        description: "Jelszó megváltoztatva!",
      });

      setPasswordData({
        code: "",
        newPassword: "",
        confirmPassword: "",
      });
      setCodeSent(false);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-forest-deep to-forest-light text-primary-foreground">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Profilom</h1>
                <p className="text-primary-foreground/90">Profil adatok és beállítások</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Fiók adatok */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Fiók adatok
              </CardTitle>
              <CardDescription>
                Cég és kapcsolattartási adatok módosítása
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail cím (nem módosítható)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Cégnév</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  placeholder="Vadásztársaság Kft."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Kapcsolattartó neve</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                  placeholder="Kovács János"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Kapcsolattartó e-mail</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  placeholder="kapcsolattarto@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Kapcsolattartó telefon</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="+36 30 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Cím</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="1234 Budapest, Fő utca 1."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxNumber">Adószám</Label>
                <Input
                  id="taxNumber"
                  value={formData.taxNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, taxNumber: e.target.value })
                  }
                  placeholder="12345678-1-23"
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Adatok mentése
              </Button>
            </CardContent>
          </Card>

          {/* Jelszó módosítás */}
          <Card>
            <CardHeader>
              <CardTitle>Jelszó módosítása</CardTitle>
              <CardDescription>
                Állítson be új jelszót a fiókjához. Először kérjen ellenőrző kódot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!codeSent ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Kattintson a gombra, hogy ellenőrző kódot küldjünk az email címére: <strong>{email}</strong>
                  </p>
                  <Button
                    onClick={handleSendCode}
                    disabled={sendingCode}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingCode ? "Küldés..." : "Ellenőrző kód küldése"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="code">Ellenőrző kód (email-ben kapott)</Label>
                    <Input
                      id="code"
                      type="text"
                      value={passwordData.code}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, code: e.target.value })
                      }
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Új jelszó</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Új jelszó megerősítése</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCodeSent(false);
                        setPasswordData({ code: "", newPassword: "", confirmPassword: "" });
                      }}
                      className="flex-1"
                    >
                      Vissza
                    </Button>
                    <Button
                      onClick={handleUpdatePassword}
                      disabled={loading || !passwordData.code || !passwordData.newPassword}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Jelszó módosítása
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Admin funkciók */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Admin funkciók</CardTitle>
                <CardDescription>
                  Csak adminisztrátorok számára elérhető funkciók
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InviteUserDialog />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
