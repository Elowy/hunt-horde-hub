import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, CheckCircle } from "lucide-react";

export default function QRAnimalSubmit() {
  const { qrCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [storageLocation, setStorageLocation] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    species: "",
    gender: "",
    hunter_name: "",
    notes: "",
  });

  useEffect(() => {
    validateQRCode();
  }, [qrCode]);

  const validateQRCode = async () => {
    try {
      setValidating(true);
      
      // First check new qr_codes table
      const { data: qrData, error: qrError } = await supabase
        .from("qr_codes")
        .select(`
          *,
          storage_locations (
            id,
            name,
            address,
            user_id
          )
        `)
        .eq("code", qrCode)
        .eq("type", "storage_location")
        .eq("is_active", true)
        .single();

      if (qrData && qrData.storage_locations) {
        // Check if expired
        if (qrData.expires_at && new Date(qrData.expires_at) < new Date()) {
          toast({
            title: "Érvénytelen QR kód",
            description: "Ez a QR kód lejárt.",
            variant: "destructive",
          });
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        setStorageLocation(qrData.storage_locations);
        setValidating(false);
        return;
      }

      // Fallback to old storage_locations table for backwards compatibility
      const { data, error } = await supabase
        .from("storage_locations")
        .select("id, name, address, user_id, qr_enabled")
        .eq("qr_code", qrCode)
        .eq("qr_enabled", true)
        .single();

      if (error || !data) {
        toast({
          title: "Érvénytelen QR kód",
          description: "Ez a QR kód nem érvényes vagy le van tiltva.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      setStorageLocation(data);
    } catch (error: any) {
      console.error("Error validating QR code:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült ellenőrizni a QR kódot",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.species || !formData.hunter_name) {
      toast({
        title: "Hiányzó adatok",
        description: "Kérem töltse ki a kötelező mezőket!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("pending_animals").insert({
        storage_location_id: storageLocation.id,
        hunter_society_id: storageLocation.user_id,
        species: formData.species,
        gender: formData.gender || null,
        hunter_name: formData.hunter_name,
        notes: formData.notes || null,
        approval_status: "pending",
        submitted_via: "qr_code",
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Sikeres beküldés!",
        description: "Az állatot bejelentette. A vadásztársaság adminisztrátorai hamarosan jóváhagyják.",
      });

      // Reset form
      setFormData({
        species: "",
        gender: "",
        hunter_name: "",
        notes: "",
      });

      // Auto redirect after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error submitting animal:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">QR kód ellenőrzése...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!storageLocation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">Érvénytelen vagy letiltott QR kód</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Sikeresen beküldve!</h2>
            <p className="text-muted-foreground">
              Az állatot bejelentette. A vadásztársaság adminisztrátorai hamarosan jóváhagyják.
            </p>
            <Button onClick={() => setSubmitted(false)} className="w-full">
              Új állat bejelentése
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-accent" />
            <CardTitle>Állat bejelentése</CardTitle>
          </div>
          <CardDescription>
            Hűtési helyszín: <strong>{storageLocation.name}</strong>
            {storageLocation.address && (
              <span className="block text-xs mt-1">{storageLocation.address}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="species">Vadfaj *</Label>
              <Select
                value={formData.species}
                onValueChange={(value) => setFormData({ ...formData, species: value })}
                required
              >
                <SelectTrigger id="species">
                  <SelectValue placeholder="Válasszon vadfajt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vaddisznó">Vaddisznó</SelectItem>
                  <SelectItem value="Őz">Őz</SelectItem>
                  <SelectItem value="Szarvas">Szarvas</SelectItem>
                  <SelectItem value="Dámvad">Dámvad</SelectItem>
                  <SelectItem value="Muflon">Muflon</SelectItem>
                  <SelectItem value="Róka">Róka</SelectItem>
                  <SelectItem value="Borz">Borz</SelectItem>
                  <SelectItem value="Nyúl">Nyúl</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Nem</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Válasszon nemet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kan">Kan</SelectItem>
                  <SelectItem value="Süldő">Süldő</SelectItem>
                  <SelectItem value="Koca">Koca</SelectItem>
                  <SelectItem value="Bak">Bak</SelectItem>
                  <SelectItem value="Suta">Suta</SelectItem>
                  <SelectItem value="Gida">Gida</SelectItem>
                  <SelectItem value="Bikaborjú">Bikaborjú</SelectItem>
                  <SelectItem value="Tehénborjú">Tehénborjú</SelectItem>
                  <SelectItem value="Bika">Bika</SelectItem>
                  <SelectItem value="Tehén">Tehén</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hunter_name">Vadász neve *</Label>
              <Input
                id="hunter_name"
                value={formData.hunter_name}
                onChange={(e) => setFormData({ ...formData, hunter_name: e.target.value })}
                placeholder="pl. Kovács János"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Megjegyzések</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Bármilyen egyéb információ..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Beküldés..." : "Állat bejelentése"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              A beküldött adatokat a vadásztársaság adminisztrátorai ellenőrzik és jóváhagyják.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
