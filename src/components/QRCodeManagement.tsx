import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCode, Download, Trash2, Plus, Calendar, MapPin, UserPlus, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface QRCode {
  id: string;
  code: string;
  type: 'storage_location' | 'guest_registration';
  name: string;
  storage_location_id: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  storage_locations?: {
    name: string;
  };
}

export const QRCodeManagement = () => {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [storageLocations, setStorageLocations] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const [newQR, setNewQR] = useState({
    type: 'guest_registration' as 'storage_location' | 'guest_registration',
    name: '',
    storage_location_id: '',
    expires_at: null as Date | null,
  });

  useEffect(() => {
    fetchQRCodes();
    fetchStorageLocations();
  }, []);

  const fetchQRCodes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("qr_codes")
        .select(`
          *,
          storage_locations (
            name
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQrCodes((data || []) as QRCode[]);
    } catch (error: any) {
      console.error("Error fetching QR codes:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a QR kódokat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("storage_locations")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setStorageLocations(data || []);
    } catch (error: any) {
      console.error("Error fetching storage locations:", error);
    }
  };

  const createQRCode = async () => {
    try {
      if (!newQR.name) {
        toast({
          title: "Hiányzó adat",
          description: "Kérem adjon nevet a QR kódnak",
          variant: "destructive",
        });
        return;
      }

      if (newQR.type === 'storage_location' && !newQR.storage_location_id) {
        toast({
          title: "Hiányzó adat",
          description: "Kérem válasszon hűtőt",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const code = `${newQR.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { error } = await supabase.from("qr_codes").insert({
        code,
        type: newQR.type,
        name: newQR.name,
        storage_location_id: newQR.type === 'storage_location' ? newQR.storage_location_id : null,
        user_id: user.id,
        expires_at: newQR.expires_at?.toISOString() || null,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "QR kód sikeresen létrehozva",
      });

      setCreateDialogOpen(false);
      setNewQR({
        type: 'guest_registration',
        name: '',
        storage_location_id: '',
        expires_at: null,
      });
      fetchQRCodes();
    } catch (error: any) {
      console.error("Error creating QR code:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("qr_codes")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: !currentState ? "QR kód aktiválva" : "QR kód deaktiválva",
      });

      fetchQRCodes();
    } catch (error: any) {
      console.error("Error toggling QR code:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteQRCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from("qr_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Siker!",
        description: "QR kód törölve",
      });

      fetchQRCodes();
    } catch (error: any) {
      console.error("Error deleting QR code:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadQR = (code: string, name: string) => {
    const svg = document.getElementById(`qr-${code}`);
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
      downloadLink.download = `qr-${name.replace(/\s+/g, "-")}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyURL = async (code: string, type: string) => {
    const url = type === 'storage_location' 
      ? `${window.location.origin}/qr-animal-submit/${code}`
      : `${window.location.origin}/guest-registration?qr=${code}`;
    
    await navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Másolva!",
      description: "A link a vágólapra került",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return <div>Betöltés...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>QR kód kezelés</CardTitle>
            <CardDescription>
              Generáljon QR kódokat vendég beiratkozáshoz és állat bejelentéshez
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Új QR kód
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új QR kód létrehozása</DialogTitle>
                <DialogDescription>
                  Hozzon létre új QR kódot vendég beiratkozáshoz vagy állat bejelentéshez
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Típus</Label>
                  <Select
                    value={newQR.type}
                    onValueChange={(value: any) => setNewQR({ ...newQR, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest_registration">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Vendég beiratkozás
                        </div>
                      </SelectItem>
                      <SelectItem value="storage_location">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Állat bejelentés (hűtő)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Név</Label>
                  <Input
                    placeholder="pl. Fő bejárat QR kód"
                    value={newQR.name}
                    onChange={(e) => setNewQR({ ...newQR, name: e.target.value })}
                  />
                </div>

                {newQR.type === 'storage_location' && (
                  <div className="space-y-2">
                    <Label>Hűtő</Label>
                    <Select
                      value={newQR.storage_location_id}
                      onValueChange={(value) => setNewQR({ ...newQR, storage_location_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon hűtőt..." />
                      </SelectTrigger>
                      <SelectContent>
                        {storageLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Érvényesség vége (opcionális)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newQR.expires_at && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {newQR.expires_at ? format(newQR.expires_at, "yyyy. MM. dd.") : "Nincs lejárat"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={newQR.expires_at || undefined}
                        onSelect={(date) => setNewQR({ ...newQR, expires_at: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {newQR.expires_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewQR({ ...newQR, expires_at: null })}
                    >
                      Lejárat törlése
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createQRCode}>Létrehozás</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {qrCodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Még nincs létrehozott QR kód
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Név</TableHead>
                <TableHead>Típus</TableHead>
                <TableHead>Hűtő</TableHead>
                <TableHead>Állapot</TableHead>
                <TableHead>Lejárat</TableHead>
                <TableHead>Létrehozva</TableHead>
                <TableHead className="text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qrCodes.map((qr) => (
                <TableRow key={qr.id}>
                  <TableCell className="font-medium">{qr.name}</TableCell>
                  <TableCell>
                    {qr.type === 'guest_registration' ? (
                      <Badge variant="outline">
                        <UserPlus className="h-3 w-3 mr-1" />
                        Vendég beiratkozás
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        Állat bejelentés
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {qr.storage_locations?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={qr.is_active}
                        onCheckedChange={() => toggleActive(qr.id, qr.is_active)}
                      />
                      {isExpired(qr.expires_at) && (
                        <Badge variant="destructive">Lejárt</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {qr.expires_at ? format(new Date(qr.expires_at), "yyyy. MM. dd.") : "Nincs"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(qr.created_at), "yyyy. MM. dd.")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{qr.name}</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col items-center gap-4">
                            <div className="bg-white p-4 rounded-lg">
                              <QRCodeSVG
                                id={`qr-${qr.code}`}
                                value={qr.type === 'storage_location' 
                                  ? `${window.location.origin}/qr-animal-submit/${qr.code}`
                                  : `${window.location.origin}/guest-registration?qr=${qr.code}`
                                }
                                size={256}
                              />
                            </div>
                            <div className="flex gap-2 w-full">
                              <Button
                                onClick={() => downloadQR(qr.code, qr.name)}
                                className="flex-1"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Letöltés
                              </Button>
                              <Button
                                onClick={() => copyURL(qr.code, qr.type)}
                                variant="outline"
                                className="flex-1"
                              >
                                {copiedCode === qr.code ? (
                                  <Check className="h-4 w-4 mr-2" />
                                ) : (
                                  <Copy className="h-4 w-4 mr-2" />
                                )}
                                Link másolása
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Biztosan törli ezt a QR kódot?")) {
                            deleteQRCode(qr.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};