import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { EditAnnouncementDialog } from "./EditAnnouncementDialog";
import { CreateAnnouncementDialog } from "./CreateAnnouncementDialog";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Announcement {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
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

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_archived", false)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      setAnnouncements(data || []);
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
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{announcement.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(announcement.created_at), "yyyy. MM. dd.", { locale: hu })}
                    </span>
                    {currentUserId === announcement.user_id && (
                      <EditAnnouncementDialog
                        announcement={announcement}
                        onSuccess={fetchAnnouncements}
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
