import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wrench, Info } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type AnnouncementType = Database["public"]["Enums"]["announcement_type"];
type MaintenanceStatus = Database["public"]["Enums"]["maintenance_status"];

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  announcement_type: AnnouncementType;
  maintenance_start: string | null;
  maintenance_end: string | null;
  maintenance_status: MaintenanceStatus | null;
}

export const GlobalAnnouncementsBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const fetchGlobalAnnouncements = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, created_at, announcement_type, maintenance_start, maintenance_end, maintenance_status")
        .eq("is_global", true)
        .eq("is_archived", false)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching global announcements:", error);
    }
  };

  useEffect(() => {
    fetchGlobalAnnouncements();

    const channel = supabase
      .channel("global-announcements-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: "is_global=eq.true",
        },
        () => {
          fetchGlobalAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusLabel = (status: MaintenanceStatus | null) => {
    if (!status) return "";
    const labels: Record<MaintenanceStatus, string> = {
      bejelentve: "Bejelentve",
      folyamatban: "Folyamatban",
      elvegezve: "Elvégezve",
    };
    return labels[status];
  };

  const getIcon = (type: AnnouncementType) => {
    if (type === "outage") return <AlertTriangle className="h-5 w-5" />;
    if (type === "maintenance") return <Wrench className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
  };

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-8">
      {announcements.map((announcement) => {
        const isOutage = announcement.announcement_type === "outage";
        const isMaintenance = announcement.announcement_type === "maintenance";
        
        return (
          <Card
            key={announcement.id}
            className={`p-6 ${
              isOutage
                ? "border-2 border-destructive bg-destructive/5"
                : isMaintenance
                ? "border-2 border-yellow-500 bg-yellow-500/5"
                : "border-2 border-primary bg-primary/5"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`mt-1 ${
                  isOutage
                    ? "text-destructive"
                    : isMaintenance
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-primary"
                }`}
              >
                {getIcon(announcement.announcement_type)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg">{announcement.title}</h3>
                  {(isMaintenance || isOutage) && announcement.maintenance_status && (
                    <Badge
                      variant={isOutage ? "destructive" : "default"}
                      className={isMaintenance ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                    >
                      {getStatusLabel(announcement.maintenance_status)}
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm">{announcement.content}</p>
                
                {(isMaintenance || isOutage) && announcement.maintenance_start && (
                  <div className="text-xs text-muted-foreground space-y-1 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Kezdés:</span>
                      <span>{format(new Date(announcement.maintenance_start), "PPP HH:mm", { locale: hu })}</span>
                    </div>
                    {announcement.maintenance_end && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Várható befejezés:</span>
                        <span>{format(new Date(announcement.maintenance_end), "PPP HH:mm", { locale: hu })}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(announcement.created_at), "PPP", { locale: hu })}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
