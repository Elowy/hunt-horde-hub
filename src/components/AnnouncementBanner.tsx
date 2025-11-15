import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { EditAnnouncementDialog } from "./EditAnnouncementDialog";
import { CreateAnnouncementDialog } from "./CreateAnnouncementDialog";

interface Announcement {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface AnnouncementBannerProps {
  isAdmin?: boolean;
  isEditor?: boolean;
}

export const AnnouncementBanner = ({ isAdmin = false, isEditor = false }: AnnouncementBannerProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);

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
    <div className="space-y-4 mb-6">
      {canCreateAnnouncement && (
        <div className="flex justify-end">
          <CreateAnnouncementDialog onSuccess={fetchAnnouncements} />
        </div>
      )}
      
      {announcements.map((announcement) => (
        <Card key={announcement.id} className="p-4 bg-accent/20">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{announcement.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(announcement.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                </span>
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
    </div>
  );
};
