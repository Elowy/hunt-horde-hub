import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

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

  const handleUpdatePassword = async () => {
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
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "Jelszó megváltoztatva!",
      });

      setPasswordData({
        newPassword: "",
        confirmPassword: "",
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
                Állítson be új jelszót a fiókjához
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <Button
                onClick={handleUpdatePassword}
                disabled={loading || !passwordData.newPassword}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Jelszó módosítása
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
