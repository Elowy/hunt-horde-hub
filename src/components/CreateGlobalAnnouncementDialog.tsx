import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type AnnouncementType = Database["public"]["Enums"]["announcement_type"];
type MaintenanceStatus = Database["public"]["Enums"]["maintenance_status"];

interface CreateGlobalAnnouncementDialogProps {
  onSuccess?: () => void;
}

export function CreateGlobalAnnouncementDialog({ onSuccess }: CreateGlobalAnnouncementDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>("news");
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [maintenanceStart, setMaintenanceStart] = useState<Date>();
  const [maintenanceEnd, setMaintenanceEnd] = useState<Date>();
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus>("unknown");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Hiba",
        description: "A cím és tartalom megadása kötelező!",
        variant: "destructive",
      });
      return;
    }

    if ((announcementType === "maintenance" || announcementType === "outage") && !maintenanceStart) {
      toast({
        title: "Hiba",
        description: "Karbantartás/kiesés esetén a kezdő időpont megadása kötelező!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nincs bejelentkezve");

      const { error } = await supabase
        .from("announcements")
        .insert({
          title: title.trim(),
          content: content.trim(),
          user_id: user.id,
          is_global: true,
          announcement_type: announcementType,
          expires_at: expiresAt?.toISOString() || null,
          maintenance_start: maintenanceStart?.toISOString() || null,
          maintenance_end: maintenanceEnd?.toISOString() || null,
          maintenance_status: (announcementType === "maintenance" || announcementType === "outage") ? maintenanceStatus : null,
        });

      if (error) throw error;

      toast({
        title: "Sikeres létrehozás",
        description: "A globális hír sikeresen létrehozva!",
      });

      setOpen(false);
      setTitle("");
      setContent("");
      setAnnouncementType("news");
      setExpiresAt(undefined);
      setMaintenanceStart(undefined);
      setMaintenanceEnd(undefined);
      setMaintenanceStatus("unknown");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error creating global announcement:", error);
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: MaintenanceStatus) => {
    const labels: Record<MaintenanceStatus, string> = {
      unknown: "Ismeretlen",
      investigating: "Vizsgálat alatt",
      fixing: "Javítás alatt",
      fixed: "Javítva",
      testing: "Tesztelés alatt",
    };
    return labels[status];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Megaphone className="h-4 w-4" />
          Globális hír létrehozása
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Új globális hír</DialogTitle>
          <DialogDescription>
            Ez a hír minden vadásztársaságnál megjelenik, kiemelten.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Típus *</Label>
              <Select value={announcementType} onValueChange={(value) => setAnnouncementType(value as AnnouncementType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz típust" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">Hír</SelectItem>
                  <SelectItem value="maintenance">Karbantartás</SelectItem>
                  <SelectItem value="outage">Szolgáltatáskiesés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Cím *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Hír címe"
                maxLength={100}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Tartalom *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Hír tartalma"
                rows={5}
                required
              />
            </div>

            {(announcementType === "maintenance" || announcementType === "outage") && (
              <>
                <div className="grid gap-2">
                  <Label>Státusz *</Label>
                  <Select value={maintenanceStatus} onValueChange={(value) => setMaintenanceStatus(value as MaintenanceStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz státuszt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">{getStatusLabel("unknown")}</SelectItem>
                      <SelectItem value="investigating">{getStatusLabel("investigating")}</SelectItem>
                      <SelectItem value="fixing">{getStatusLabel("fixing")}</SelectItem>
                      <SelectItem value="fixed">{getStatusLabel("fixed")}</SelectItem>
                      <SelectItem value="testing">{getStatusLabel("testing")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Kezdő időpont *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !maintenanceStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {maintenanceStart ? format(maintenanceStart, "PPP HH:mm") : "Válassz dátumot"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={maintenanceStart}
                        onSelect={setMaintenanceStart}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Input
                          type="time"
                          value={maintenanceStart ? format(maintenanceStart, "HH:mm") : ""}
                          onChange={(e) => {
                            if (maintenanceStart && e.target.value) {
                              const [hours, minutes] = e.target.value.split(":");
                              const newDate = new Date(maintenanceStart);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              setMaintenanceStart(newDate);
                            }
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label>Záró időpont</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !maintenanceEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {maintenanceEnd ? format(maintenanceEnd, "PPP HH:mm") : "Válassz dátumot"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={maintenanceEnd}
                        onSelect={setMaintenanceEnd}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Input
                          type="time"
                          value={maintenanceEnd ? format(maintenanceEnd, "HH:mm") : ""}
                          onChange={(e) => {
                            if (maintenanceEnd && e.target.value) {
                              const [hours, minutes] = e.target.value.split(":");
                              const newDate = new Date(maintenanceEnd);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              setMaintenanceEnd(newDate);
                            }
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {announcementType === "news" && (
              <div className="grid gap-2">
                <Label>Lejárati dátum (opcionális)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiresAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, "PPP") : "Nincs lejárat"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={setExpiresAt}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Ha nincs megadva, a hír határozatlan ideig látható marad
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Létrehozás..." : "Létrehozás"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
