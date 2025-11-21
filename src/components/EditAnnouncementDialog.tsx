import { useState } from "react";
import { Edit, Trash2, CalendarIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type HunterCategory = Database["public"]["Enums"]["hunter_category"];
type AnnouncementType = Database["public"]["Enums"]["announcement_type"];
type MaintenanceStatus = Database["public"]["Enums"]["maintenance_status"];

const HUNTER_CATEGORIES: { value: HunterCategory; label: string }[] = [
  { value: "tag", label: "Tag" },
  { value: "vendeg", label: "Vendég" },
  { value: "bervadasz", label: "Bérvadász" },
  { value: "ib_vendeg", label: "IB Vendég" },
  { value: "trofeas_vadasz", label: "Trófeás Vadász" },
  { value: "egyeb", label: "Egyéb" },
];

interface Announcement {
  id: string;
  title: string;
  content: string;
  user_id: string;
  expires_at: string | null;
  hunter_categories: HunterCategory[] | null;
  announcement_type: AnnouncementType | null;
  maintenance_start: string | null;
  maintenance_end: string | null;
  maintenance_status: MaintenanceStatus | null;
  is_global: boolean;
}

interface EditAnnouncementDialogProps {
  announcement: Announcement;
  onSuccess?: () => void;
}

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

export const EditAnnouncementDialog = ({ announcement, onSuccess }: EditAnnouncementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(announcement.title);
  const [content, setContent] = useState(announcement.content);
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>(announcement.announcement_type || "news");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    announcement.expires_at ? new Date(announcement.expires_at) : undefined
  );
  const [maintenanceStart, setMaintenanceStart] = useState<Date | undefined>(
    announcement.maintenance_start ? new Date(announcement.maintenance_start) : undefined
  );
  const [maintenanceEnd, setMaintenanceEnd] = useState<Date | undefined>(
    announcement.maintenance_end ? new Date(announcement.maintenance_end) : undefined
  );
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus>(
    announcement.maintenance_status || "unknown"
  );
  const [selectedCategories, setSelectedCategories] = useState<HunterCategory[]>(announcement.hunter_categories || []);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast.error("A cím és tartalom megadása kötelező!");
      return;
    }

    if ((announcementType === "maintenance" || announcementType === "outage") && !maintenanceStart) {
      toast.error("Karbantartás/kiesés esetén a kezdő időpont megadása kötelező!");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("announcements")
        .update({
          title: title.trim(),
          content: content.trim(),
          announcement_type: announcementType,
          expires_at: announcementType === "news" ? (expiresAt?.toISOString() || null) : null,
          maintenance_start: maintenanceStart?.toISOString() || null,
          maintenance_end: maintenanceEnd?.toISOString() || null,
          maintenance_status: (announcementType === "maintenance" || announcementType === "outage") ? maintenanceStatus : null,
          hunter_categories: selectedCategories.length > 0 ? selectedCategories : null,
        })
        .eq("id", announcement.id);

      if (error) throw error;

      toast.success("Hír sikeresen frissítve");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Hiba történt a hír frissítésekor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcement.id);

      if (error) throw error;

      toast.success("Hír sikeresen törölve");
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Hiba történt a hír törlésekor");
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Hír szerkesztése</DialogTitle>
              <DialogDescription>
                Módosítsd a hír tartalmát.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Típus *</Label>
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
                <Label htmlFor="edit-title">Cím *</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Hír címe"
                  maxLength={100}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-content">Tartalom *</Label>
                <Textarea
                  id="edit-content"
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
                {loading ? "Mentés..." : "Mentés"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
            <AlertDialogDescription>
              Ez a művelet nem vonható vissza. A hír véglegesen törlésre kerül.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Törlés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};