import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QrCode, Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

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
    try {
      setLoading(true);
      const code = `${locationId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const { error } = await supabase
        .from("storage_locations")
        .update({
          qr_code: code,
          qr_enabled: true,
        })
        .eq("id", locationId);

      if (error) throw error;

      setEnabled(true);
      toast({
        title: "Siker!",
        description: "QR kód sikeresen generálva!",
      });
      onUpdate();
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

  const toggleQREnabled = async (checked: boolean) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("storage_locations")
        .update({ qr_enabled: checked })
        .eq("id", locationId);

      if (error) throw error;

      setEnabled(checked);
      toast({
        title: "Siker!",
        description: checked ? "QR kód aktiválva!" : "QR kód deaktiválva!",
      });
      onUpdate();
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

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
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
      downloadLink.download = `qr-${locationName.replace(/\s+/g, "-")}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyURL = async () => {
    const url = `${window.location.origin}/qr-animal-submit/${qrCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Másolva!",
      description: "A link a vágólapra került",
    });
  };

  const qrURL = qrCode ? `${window.location.origin}/qr-animal-submit/${qrCode}` : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <QrCode className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>QR kód kezelés - {locationName}</DialogTitle>
          <DialogDescription>
            QR kód segítségével bárki bejelentkezés nélkül jelenthet be állatot erre a hűtési helyszínre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!qrCode ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                Még nincs generálva QR kód ehhez a helyszínhez.
              </p>
              <Button onClick={generateQRCode} disabled={loading}>
                <QrCode className="h-4 w-4 mr-2" />
                QR kód generálása
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="qr-enabled">QR kód aktív</Label>
                  <p className="text-sm text-muted-foreground">
                    Engedélyezi a bejelentkezés nélküli hozzáadást
                  </p>
                </div>
                <Switch
                  id="qr-enabled"
                  checked={enabled}
                  onCheckedChange={toggleQREnabled}
                  disabled={loading}
                />
              </div>

              {enabled && (
                <>
                  <div className="flex justify-center bg-white p-4 rounded-lg">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={qrURL}
                      size={200}
                      level="H"
                      includeMargin
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>QR kód URL</Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={qrURL}
                        readOnly
                        className="flex-1 text-sm border rounded-md px-3 py-2 bg-muted"
                      />
                      <Button variant="outline" size="sm" onClick={copyURL}>
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={downloadQR} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      QR kód letöltése
                    </Button>
                    <Button
                      variant="outline"
                      onClick={generateQRCode}
                      className="flex-1"
                      disabled={loading}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Új kód generálása
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
