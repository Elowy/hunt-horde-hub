import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, User, Mail, Crown, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { AddExistingHunterDialog } from "@/components/AddExistingHunterDialog";
import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MembershipDiscountInfo } from "@/components/MembershipDiscountInfo";
import { UserTickets } from "@/components/UserTickets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro, loading: subscriptionLoading } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isHunter, setIsHunter] = useState(false);
  const [hunterSocieties, setHunterSocieties] = useState<Array<{ id: string; company_name: string }>>([]);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    taxNumber: "",
    userType: "",
  });
  const [passwordData, setPasswordData] = useState({
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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
        .eq("user_id", user.id);

      if (roles) {
        setIsAdmin(roles.some(r => r.role === "admin"));
        setIsEditor(roles.some(r => r.role === "editor"));
        setIsHunter(roles.some(r => r.role === "hunter"));
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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
          userType: profile.user_type || "",
        });
      }

      // If user is hunter, fetch their societies
      if (profile?.user_type === "hunter") {
        const { data: membershipData } = await supabase
          .from("hunter_society_members")
          .select(`
            hunter_society_id,
            profiles!hunter_society_members_hunter_society_id_fkey (
              id,
              company_name
            )
          `)
          .eq("hunter_id", user.id);

        if (membershipData && membershipData.length > 0) {
          const societies = membershipData.map((m: any) => ({
            id: m.profiles.id,
            company_name: m.profiles.company_name
          }));
          setHunterSocieties(societies);
        }
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

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);

      // Call the edge function to delete the entire account
      const { error } = await supabase.functions.invoke('delete-user-account', {
        method: 'POST',
      });

      if (error) throw error;

      toast({
        title: "Fiók törölve",
        description: "Fiókja és minden kapcsolódó adata sikeresen törölve lett.",
      });

      // Sign out and redirect to home page
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message || "Hiba történt a fiók törlése során.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <PageHeader 
        isAdmin={isAdmin}
        isEditor={false}
        onLogout={handleLogout}
      />

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
                <Label htmlFor="userType">Felhasználó típusa (nem módosítható)</Label>
                <Input
                  id="userType"
                  value={
                    formData.userType === "hunter" 
                      ? "Vadász" 
                      : formData.userType === "hunter_society" 
                      ? "Vadásztársaság" 
                      : formData.userType === "buyer"
                      ? "Felvásárló"
                      : "Ismeretlen"
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Cégnév (nem módosítható)</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  disabled
                  className="bg-muted"
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

          {/* Hunter Societies - only for hunters */}
          {isHunter && hunterSocieties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Vadásztársaságok
                </CardTitle>
                <CardDescription>
                  Azok a vadásztársaságok, amelyeknek tagja vagy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hunterSocieties.map((society) => (
                    <div
                      key={society.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <p className="font-medium">{society.company_name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                {subscriptionLoading ? (
                  <p className="text-muted-foreground">Előfizetés ellenőrzése...</p>
                ) : isPro ? (
                  <div className="space-y-2">
                    <InviteUserDialog />
                    <AddExistingHunterDialog />
                  </div>
                ) : (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10">
                    <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-sm">
                      Felhasználók meghívása csak Pro előfizetéssel érhető el.{" "}
                      <Button
                        variant="link"
                        className="h-auto p-0 text-yellow-600 dark:text-yellow-400"
                        onClick={() => navigate("/subscriptions")}
                      >
                        Váltson Pro csomagra
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Membership and Discount Info */}
          <MembershipDiscountInfo />

          {/* User Tickets */}
          <UserTickets 
            isHunter={isHunter}
            isAdmin={isAdmin}
            isEditor={isEditor}
          />

          {/* Adatvédelmi és fiók törlés */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Veszélyzóna</CardTitle>
              <CardDescription>
                Fiók törlés és adatvédelmi beállítások
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/privacy-policy")}
                  className="w-full mb-4"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Adatvédelmi Nyilatkozat
                </Button>
              </div>
              
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription>
                  <strong>Figyelem!</strong> A fiók törlése végleges és visszafordíthatatlan. 
                  Minden adat véglegesen törlésre kerül.
                </AlertDescription>
              </Alert>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Fiók törlése
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Biztosan törli a fiókját?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Ez a művelet <strong>véglegesen törli</strong> az összes adatát, beleértve:
                      </p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Személyes adatok és profil információk</li>
                        <li>Vadászati nyilvántartások és beiratkozások</li>
                        <li>Szállítási dokumentumok</li>
                        <li>Hűtési helyszínek és beállítások</li>
                        <li>Összes kapcsolódó adat</li>
                      </ul>
                      <p className="text-destructive font-semibold mt-4">
                        Ez a művelet nem vonható vissza!
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deletingAccount}>Mégse</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deletingAccount ? "Törlés..." : "Igen, törlöm a fiókom"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
