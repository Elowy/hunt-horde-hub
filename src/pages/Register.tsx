import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, Mail, Phone, MapPin, User, Lock, FileText, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
    userType: "hunter_society",
    hunterLicenseNumber: "",
    birthDate: "",
    privacyPolicyAccepted: false,
    newsletterSubscribed: false
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Hiba",
        description: "A jelszavak nem egyeznek!",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Hiba",
        description: "A jelszónak legalább 6 karakter hosszúnak kell lennie!",
        variant: "destructive"
      });
      return;
    }

    if (!formData.privacyPolicyAccepted) {
      toast({
        title: "Hiba",
        description: "El kell fogadnia az adatvédelmi nyilatkozatot!",
        variant: "destructive"
      });
      return;
    }

    // Vadász típusnál ellenőrizzük a meghívót
    if (formData.userType === "hunter") {
      const { data: invitation, error: invitationError } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", formData.email)
        .eq("role", "hunter")
        .eq("accepted", false)
        .single();

      if (invitationError || !invitation) {
        toast({
          title: "Meghívó szükséges",
          description: "Vadász regisztrációhoz érvényes meghívó szükséges. Kérjen meghívót a rendszer adminisztrátorától!",
          variant: "destructive"
        });
        return;
      }

      // Ellenőrizzük a lejáratot
      const expiresAt = new Date(invitation.expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        toast({
          title: "Lejárt meghívó",
          description: "A meghívó lejárt. Kérjen új meghívót a rendszer adminisztrátorától!",
          variant: "destructive"
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            company_name: formData.userType !== "hunter" ? formData.companyName : null,
            contact_name: formData.contactName,
            contact_email: formData.email,
            contact_phone: formData.phone,
            address: formData.address,
            user_type: formData.userType,
            hunter_license_number: formData.userType === "hunter" ? formData.hunterLicenseNumber : null,
            birth_date: formData.userType === "hunter" ? formData.birthDate : null,
            privacy_policy_accepted: formData.userType === "hunter" ? formData.privacyPolicyAccepted : null,
          },
        },
      });

      if (error) {
        toast({
          title: "Regisztrációs hiba",
          description: error.message === "User already registered" 
            ? "Ez az email cím már regisztrálva van!" 
            : error.message,
          variant: "destructive"
        });
        return;
      }

      if (data.user) {
        // Ha vadász és van meghívó, megjelöljük elfogadottnak
        if (formData.userType === "hunter") {
          await supabase
            .from("invitations")
            .update({ accepted: true })
            .eq("email", formData.email)
            .eq("role", "hunter")
            .eq("accepted", false);
        }

        // Minden új felhasználó automatikusan kap 1 hónapos Pro próbaidőszakot
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        
        await supabase.from("trial_subscriptions").insert({
          user_id: data.user.id,
          tier: "pro",
          expires_at: expiresAt.toISOString(),
          newsletter_subscribed: formData.newsletterSubscribed,
        });

        toast({
          title: "Sikeres regisztráció!",
          description: "Fiókja létrehozva. 1 hónap ingyenes Pro előfizetést kapott!",
        });
        
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: "Váratlan hiba történt. Kérjük, próbálja újra!",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-earth-warm to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-forest-deep">Regisztrálja cégét</CardTitle>
          <CardDescription>
            Csatlakozzon a Vadgondnokhoz vadászati nyilvántartásának kezeléséhez
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userType" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-forest-deep" />
                  Felhasználó típus
                </Label>
                <select
                  id="userType"
                  value={formData.userType}
                  onChange={(e) => handleInputChange("userType", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="hunter_society">Vadásztársaság</option>
                  <option value="buyer">Felvásárló</option>
                  <option value="hunter">Vadász</option>
                </select>
              </div>

              {formData.userType !== "hunter" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-forest-deep" />
                      Cég név
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Példa Vadásztársaság Kft."
                      value={formData.companyName}
                      onChange={(e) => handleInputChange("companyName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-forest-deep" />
                      Kapcsolattartó neve
                    </Label>
                    <Input
                      id="contactName"
                      type="text"
                      placeholder="Kovács János"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange("contactName", e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="contactName" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-forest-deep" />
                      Név
                    </Label>
                    <Input
                      id="contactName"
                      type="text"
                      placeholder="Kovács János"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange("contactName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hunterLicenseNumber" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-forest-deep" />
                      Vadászjegyszám
                    </Label>
                    <Input
                      id="hunterLicenseNumber"
                      type="text"
                      placeholder="VJ-123456"
                      value={formData.hunterLicenseNumber}
                      onChange={(e) => handleInputChange("hunterLicenseNumber", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-forest-deep" />
                      Születési idő
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange("birthDate", e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-forest-deep" />
                  Email cím
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="pelda@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-forest-deep" />
                  Telefonszám
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+36 30 123 4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-forest-deep" />
                  Cím
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="1234 Budapest, Példa utca 12."
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Account Security */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-forest-deep" />
                  Jelszó
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Adjon meg egy biztonságos jelszót"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-forest-deep" />
                  Jelszó megerősítése
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Erősítse meg a jelszavát"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="privacyPolicy"
                checked={formData.privacyPolicyAccepted}
                onCheckedChange={(checked) => handleInputChange("privacyPolicyAccepted", checked as boolean)}
                required
              />
              <Label htmlFor="privacyPolicy" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Elfogadom az{" "}
                <Link to="/privacy-policy" className="text-forest-deep hover:text-forest-light underline">
                  adatvédelmi nyilatkozatot
                </Link>
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="newsletter"
                checked={formData.newsletterSubscribed}
                onCheckedChange={(checked) => handleInputChange("newsletterSubscribed", checked as boolean)}
              />
              <Label htmlFor="newsletter" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Feliratkozom a hírlevélre és kapok 1 hónap ingyenes Pro előfizetést! 🎁
              </Label>
            </div>

            <Button
              type="submit" 
              variant="hunting" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? "Regisztráció folyamatban..." : "Regisztráció"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Már van fiókja?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-forest-deep hover:text-forest-light"
                onClick={() => navigate("/login")}
              >
                Jelentkezzen be itt
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;