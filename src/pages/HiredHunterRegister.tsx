import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function HiredHunterRegister() {
  const { token } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hunter, setHunter] = useState<any>(null);
  const [expired, setExpired] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    license_number: "",
    address: "",
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from("hired_hunters")
        .select("*")
        .eq("invitation_token", token)
        .single();

      if (error || !data) {
        toast({
          title: "Érvénytelen link",
          description: "A regisztrációs link nem létezik.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data.is_registered) {
        setAlreadyRegistered(true);
        setLoading(false);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      setHunter(data);
      setFormData({
        name: data.name || "",
        license_number: data.license_number || "",
        address: data.address || "",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az adatokat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.license_number) {
      toast({
        title: "Hiányzó adatok",
        description: "Kérem töltse ki a kötelező mezőket!",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("hired_hunters")
        .update({
          name: formData.name,
          license_number: formData.license_number,
          address: formData.address || null,
          is_registered: true,
          registered_at: new Date().toISOString(),
        })
        .eq("id", hunter.id);

      if (error) throw error;

      toast({
        title: "Sikeres regisztráció!",
        description: "Adatai sikeresen rögzítésre kerültek.",
      });

      setAlreadyRegistered(true);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <CardTitle>Link lejárt</CardTitle>
            <CardDescription>
              A regisztrációs link már lejárt. Kérjük, vegye fel a kapcsolatot a vadásztársasággal.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (alreadyRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <CardTitle>Sikeres regisztráció</CardTitle>
            <CardDescription>
              Adatai sikeresen rögzítésre kerültek. A vadásztársaság hamarosan felveszi Önnel a kapcsolatot.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bérvadász regisztráció</CardTitle>
          <CardDescription>
            Kérjük, töltse ki vagy módosítsa adatait
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <AlertDescription>
                A *-gal jelölt mezők kitöltése kötelező
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="name">
                Név <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Teljes név"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license">
                Vadászjegy száma <span className="text-destructive">*</span>
              </Label>
              <Input
                id="license"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="pl. VJ123456"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Cím</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Teljes lakcím"
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mentés...
                </>
              ) : (
                "Regisztráció befejezése"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
