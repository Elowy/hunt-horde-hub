import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { EditAnnouncementDialog } from "./EditAnnouncementDialog";
import { CreateAnnouncementDialog } from "./CreateAnnouncementDialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
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
      className="space-y-4 mb-6"
    >
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            {showAnnouncements ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <h2 className="text-2xl font-bold">Hírek</h2>
          </Button>
        </CollapsibleTrigger>
        {canCreateAnnouncement && (
          <CreateAnnouncementDialog onSuccess={fetchAnnouncements} />
        )}
      </div>
      
      <CollapsibleContent className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="p-4 bg-accent/20">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{announcement.title}</h3>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(announcement.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                  </span>
                  {announcement.expires_at && (
                    <span className="text-xs text-muted-foreground">
                      • Lejár: {format(new Date(announcement.expires_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
              </div>
              {currentUserId === announcement.user_id && (
                <EditAnnouncementDialog 
                  announcement={announcement} 
                  onSuccess={fetchAnnouncements} 
                />
              )}
            </div>
          </Card>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
