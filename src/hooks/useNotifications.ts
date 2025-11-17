import { supabase } from "@/integrations/supabase/client";

type NotificationType = 'transport' | 'storage_full' | 'animal_add' | 'animal_update' | 'animal_delete' | 'registration_approved' | 'registration_rejected';

interface NotificationData {
  notification_type: NotificationType;
  data: any;
}

export const useNotifications = () => {
  const sendNotification = async (notificationData: NotificationData) => {
    try {
      // IP cím lekérése (frontend-ről nem mindig pontos)
      let ipAddress = "Ismeretlen";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (error) {
        console.error("Failed to fetch IP:", error);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        return;
      }

      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          ...notificationData,
          ip_address: ipAddress,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Notification error:", error);
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  return { sendNotification };
};
