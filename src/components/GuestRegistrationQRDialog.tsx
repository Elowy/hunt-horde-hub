import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

export const GuestRegistrationQRDialog = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const guestRegistrationUrl = `${window.location.origin}/guest-registration`;

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(guestRegistrationUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Hiba a QR kód generálásakor");
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement("a");
    link.download = "vendeg-beiratkozas-qr.png";
    link.href = qrCodeUrl;
    link.click();
    toast.success("QR kód letöltve");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <QrCode className="mr-2 h-4 w-4" />
          Vendég beiratkozási QR kód
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vendég beiratkozási QR kód</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCodeUrl} alt="QR kód" className="w-full" />
              </div>
            )}
            <div className="text-sm text-center text-muted-foreground break-all">
              {guestRegistrationUrl}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={downloadQRCode} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              QR kód letöltése (PNG)
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A QR kód beolvasásával vagy a webcím megnyitásával vendégek beiratkozhatnak vadászatra.
              A beiratkozás adminisztrátori jóváhagyást igényel.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
