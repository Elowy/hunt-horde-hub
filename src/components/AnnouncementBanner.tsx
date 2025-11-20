import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { EditAnnouncementDialog } from "./EditAnnouncementDialog";
import { CreateAnnouncementDialog } from "./CreateAnnouncementDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, AlertTriangle, Wrench } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Database } from "@/integrations/supabase/types";

type HunterCategory = Database["public"]["Enums"]["hunter_category"];
type AnnouncementType = Database["public"]["Enums"]["announcement_type"];
type MaintenanceStatus = Database["public"]["Enums"]["maintenance_status"];

interface Announcement {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_global: boolean;
  hunter_categories: HunterCategory[] | null;
  announcement_type: Database["public"]["Enums"]["announcement_type"];
  maintenance_start: string | null;
  maintenance_end: string | null;
  maintenance_status: Database["public"]["Enums"]["maintenance_status"] | null;
}

interface AnnouncementBannerProps {
  isAdmin?: boolean;
  isEditor?: boolean;
}

export const AnnouncementBanner = ({ isAdmin = false, isEditor = false }: AnnouncementBannerProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAnnouncements, setShowAnnouncements] = useState(() => {
    const saved = localStorage.getItem("show-announcements");
    return saved !== "false"; // Default to true
  });

  useEffect(() => {
    localStorage.setItem("show-announcements", showAnnouncements.toString());
  }, [showAnnouncements]);

  const fetchAnnouncements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Check if user is a hunter and get their category
      let hunterCategory: HunterCategory | null = null;
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("hunter_category")
          .eq("id", user.id)
          .single();
        
        hunterCategory = profileData?.hunter_category || null;
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_archived", false)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter announcements based on hunter category
      let filteredData = data || [];
      if (hunterCategory) {
        filteredData = filteredData.filter(announcement => {
          // If no categories specified, show to everyone
          if (!announcement.hunter_categories || announcement.hunter_categories.length === 0) {
            return true;
          }
          // Otherwise, only show if hunter's category is included
          return announcement.hunter_categories.includes(hunterCategory);
        });
      }

      // Sort: global announcements first, then by created_at
      const sortedData = filteredData.sort((a, b) => {
        if (a.is_global && !b.is_global) return -1;
        if (!a.is_global && b.is_global) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAnnouncements(sortedData);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel("announcements-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          fetchAnnouncements();
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
      unknown: "Ismeretlen",
      investigating: "Vizsgálat alatt",
      fixing: "Javítás alatt",
      fixed: "Javítva",
      testing: "Tesztelés alatt",
    };
    return labels[status];
  };

  const canCreateAnnouncement = isAdmin || isEditor;

  if (announcements.length === 0 && !canCreateAnnouncement) {
    return null;
  }

  return (
    <Collapsible
      open={showAnnouncements}
      onOpenChange={setShowAnnouncements}
      className="mb-8"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
              <ChevronDown className={`h-5 w-5 transition-transform ${showAnnouncements ? '' : '-rotate-90'}`} />
            </Button>
          </CollapsibleTrigger>
          <h2 className="text-2xl font-bold text-forest-deep">Hírek</h2>
        </div>
        {canCreateAnnouncement && (
          <CreateAnnouncementDialog onSuccess={fetchAnnouncements} />
        )}
      </div>
      
      <CollapsibleContent>
        {announcements.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-muted-foreground">
              {canCreateAnnouncement ? "Még nincs hír. Adjon hozzá egyet a kezdéshez!" : "Jelenleg nincsenek hírek."}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map((announcement) => {
              const isOutage = announcement.announcement_type === "outage";
              const isMaintenance = announcement.announcement_type === "maintenance";
              
              return (
                <Card 
                  key={announcement.id} 
                  className={`p-6 hover:shadow-lg transition-shadow ${
                    isOutage
                      ? 'border-2 border-destructive bg-destructive/5'
                      : isMaintenance
                      ? 'border-2 border-yellow-500 bg-yellow-500/5'
                      : announcement.is_global 
                      ? 'border-2 border-primary bg-gradient-to-br from-primary/5 to-transparent' 
                      : ''
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {(isMaintenance || isOutage) && (
                            <div className={isOutage ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"}>
                              {isOutage ? <AlertTriangle className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                            </div>
                          )}
                          <h3 className="font-semibold text-lg">{announcement.title}</h3>
                          {announcement.is_global && (
                            <Badge variant="default" className="text-xs">
                              Globális
                            </Badge>
                          )}
                          {(isMaintenance || isOutage) && announcement.maintenance_status && (
                            <Badge
                              variant={isOutage ? "destructive" : "default"}
                              className={isMaintenance ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                            >
                              {getStatusLabel(announcement.maintenance_status)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {announcement.content}
                        </p>
                        {(isMaintenance || isOutage) && announcement.maintenance_start && (
                          <div className="text-xs text-muted-foreground space-y-1 mb-2">
                            <div>
                              <span className="font-semibold">Kezdés:</span>{" "}
                              {format(new Date(announcement.maintenance_start), "PPP HH:mm", { locale: hu })}
                            </div>
                            {announcement.maintenance_end && (
                              <div>
                                <span className="font-semibold">Befejezés:</span>{" "}
                                {format(new Date(announcement.maintenance_end), "PPP HH:mm", { locale: hu })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(announcement.created_at), "yyyy. MM. dd.", { locale: hu })}
                        {announcement.expires_at && (
                          <span className="ml-2">
                            • Lejár: {format(new Date(announcement.expires_at), "yyyy. MM. dd.", { locale: hu })}
                          </span>
                        )}
                      </span>
                      {currentUserId === announcement.user_id && !announcement.is_global && (
                        <EditAnnouncementDialog
                          announcement={announcement}
                          onSuccess={fetchAnnouncements}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
