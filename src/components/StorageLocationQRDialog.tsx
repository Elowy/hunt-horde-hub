import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Copy, Check, RefreshCw, Calendar } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface StorageLocationQRDialogProps {
  locationId: string;
  locationName: string;
  onUpdate: () => void;
}

interface QRCodeData {
  id: string;
  code: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export const StorageLocationQRDialog = ({ locationId, locationName, onUpdate }: StorageLocationQRDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrData, setQRData] = useState<QRCodeData | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchQRCode();
    }
  }, [open, locationId]);

  const fetchQRCode = async () => {
    try {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("storage_location_id", locationId)
        .eq("type", "storage_location")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      setQRData(data);
      if (data?.expires_at) {
        setExpiresAt(new Date(data.expires_at).toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error("Error fetching QR code:", error);
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (qrData) {
        await supabase
          .from("qr_codes")
          .update({ is_active: false })
          .eq("storage_location_id", locationId);
      }

      const newCode = `SL-${locationId.slice(0, 8)}-${Date.now()}`;
      
      const { data, error } = await supabase
        .from("qr_codes")
        .insert({
          code: newCode,
          type: "storage_location",
          name: `${locationName} QR kód`,
          storage_location_id: locationId,
          is_active: true,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setQRData(data);
      toast.success("QR kód sikeresen generálva");
      onUpdate();
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Hiba a QR kód generálásakor");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async () => {
    if (!qrData) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("qr_codes")
        .update({ is_active: !qrData.is_active })
        .eq("id", qrData.id);

      if (error) throw error;

      setQRData({ ...qrData, is_active: !qrData.is_active });
      toast.success(qrData.is_active ? "QR kód letiltva" : "QR kód engedélyezve");
      onUpdate();
    } catch (error) {
      console.error("Error toggling QR code:", error);
      toast.error("Hiba a QR kód állapotának módosításakor");
    } finally {
      setLoading(false);
    }
  };

  const updateExpiresAt = async () => {
    if (!qrData) return;
    
    setLoading(true);
    try {
      const expiryDate = expiresAt ? new Date(expiresAt).toISOString() : null;
      
      const { error } = await supabase
        .from("qr_codes")
        .update({ expires_at: expiryDate })
        .eq("id", qrData.id);

      if (error) throw error;

      setQRData({ ...qrData, expires_at: expiryDate });
      toast.success(expiryDate ? "Lejárati idő beállítva" : "Lejárati idő törölve");
      onUpdate();
    } catch (error) {
      console.error("Error updating expiry:", error);
      toast.error("Hiba a lejárati idő beállításakor");
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrData) return;
    
    const svg = document.querySelector(`#qr-storage-${locationId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `storage-qr-${locationName}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast.success("QR kód letöltve");
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const copyURL = () => {
    if (!qrData) return;
    
    const url = `${window.location.origin}/qr-animal-submit?code=${qrData.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link másolva");
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = qrData ? `${window.location.origin}/qr-animal-submit?code=${qrData.code}` : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4 mr-2" />
          QR kód
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{locationName} - QR kód kezelése</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!qrData ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Még nincs QR kód generálva ehhez a hűtőhöz.
              </p>
              <Button onClick={generateQRCode} disabled={loading}>
                <QrCode className="mr-2 h-4 w-4" />
                QR kód generálása
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="qr-active">QR kód aktív</Label>
                <Switch
                  id="qr-active"
                  checked={qrData.is_active}
                  onCheckedChange={toggleActive}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires-at">Lejárati idő</Label>
                <div className="flex gap-2">
                  <Input
                    id="expires-at"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    disabled={loading}
                  />
                  <Button onClick={updateExpiresAt} disabled={loading} size="sm">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
                {qrData.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Lejár: {new Date(qrData.expires_at).toLocaleDateString('hu-HU')}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG 
                    id={`qr-storage-${locationId}`}
                    value={qrUrl}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="text-sm text-center text-muted-foreground break-all px-4">
                  {qrUrl}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={copyURL} variant="outline" className="w-full">
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Másolva" : "Link másolása"}
                </Button>
                
                <Button onClick={downloadQR} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  QR kód letöltése (PNG)
                </Button>

                <Button onClick={generateQRCode} variant="outline" className="w-full" disabled={loading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Új QR kód generálása
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                A QR kód beolvasásával vadászok közvetlenül ezt a hűtőt megcélozva rögzíthetnek vadat.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
