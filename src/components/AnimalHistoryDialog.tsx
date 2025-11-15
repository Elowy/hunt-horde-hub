import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, User, Calendar, FileEdit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActivityLog {
  id: string;
  created_at: string;
  action: string;
  user_email: string | null;
  details: any;
}

interface AnimalHistoryDialogProps {
  animalId: string;
  animalIdentifier: string;
}

const fieldLabels: Record<string, string> = {
  animal_id: "Vad azonosító",
  species: "Faj",
  gender: "Nem",
  weight: "Súly (kg)",
  class: "Osztály",
  age: "Életkor",
  condition: "Kondíció",
  hunter_name: "Vadász neve",
  hunter_type: "Vadász típusa",
  storage_location_id: "Tárolóhely ID",
  security_zone_id: "Biztonsági zóna ID",
  is_transported: "Szállítva",
  transported_at: "Szállítás dátuma",
  vet_check: "Állatorvosi vizsgálat",
  vet_result: "Vizsgálat eredménye",
  vet_doctor_name: "Állatorvos neve",
  notes: "Jegyzetek",
};

const actionLabels: Record<string, string> = {
  create: "Létrehozva",
  update: "Módosítva",
  delete: "Törölve",
};

const actionColors: Record<string, string> = {
  create: "bg-green-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
};

export const AnimalHistoryDialog = ({ animalId, animalIdentifier }: AnimalHistoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, animalId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", "animal")
        .eq("entity_id", animalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a történetet.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Igen" : "Nem";
    if (key.includes("_at") || key.includes("date")) {
      return new Date(value).toLocaleString("hu-HU");
    }
    return String(value);
  };

  const renderChanges = (details: any, action: string) => {
    if (!details) return null;

    if (action === "create") {
      const newData = details.new || {};
      return (
        <div className="space-y-2 mt-2">
          <p className="text-sm font-medium text-muted-foreground">Új értékek:</p>
          <div className="grid gap-1 text-sm">
            {Object.entries(newData).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{fieldLabels[key] || key}:</span>
                <span className="font-medium">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (action === "delete") {
      const oldData = details.old || {};
      return (
        <div className="space-y-2 mt-2">
          <p className="text-sm font-medium text-muted-foreground">Törölt értékek:</p>
          <div className="grid gap-1 text-sm">
            {Object.entries(oldData).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{fieldLabels[key] || key}:</span>
                <span className="font-medium line-through">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (action === "update") {
      const changes = Object.entries(details).filter(([key]) => key !== "new" && key !== "old");
      if (changes.length === 0) return <p className="text-sm text-muted-foreground mt-2">Nincs változás rögzítve.</p>;

      return (
        <div className="space-y-2 mt-2">
          <p className="text-sm font-medium text-muted-foreground">Változások:</p>
          <div className="space-y-2">
            {changes.map(([key, change]: [string, any]) => (
              <div key={key} className="border-l-2 border-primary pl-3">
                <p className="text-sm font-medium">{fieldLabels[key] || key}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground line-through">{formatValue(key, change.old)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium text-primary">{formatValue(key, change.new)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Történet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Vad történet - {animalIdentifier}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Betöltés...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nincs rögzített történet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={actionColors[log.action] || "bg-gray-500"}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                      {index === 0 && <Badge variant="outline">Legutóbbi</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString("hu-HU")}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{log.user_email || "Ismeretlen felhasználó"}</span>
                  </div>

                  {renderChanges(log.details, log.action)}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
