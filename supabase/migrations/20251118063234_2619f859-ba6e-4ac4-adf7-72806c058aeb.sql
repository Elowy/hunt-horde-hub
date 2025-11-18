-- Add announcement notification setting to notification_settings table
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS notify_on_announcement boolean DEFAULT true;

-- Update the notify_users_new_announcement function to handle global and company announcements
CREATE OR REPLACE FUNCTION public.notify_users_new_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  target_user_id UUID;
  announcement_author_company TEXT;
  is_global_announcement BOOLEAN;
BEGIN
  -- Get the announcement type and company of the author
  is_global_announcement := COALESCE(NEW.is_global, false);
  
  SELECT company_name INTO announcement_author_company
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- If it's a global announcement (from super admin), notify ALL users
  IF is_global_announcement THEN
    FOR target_user_id IN 
      SELECT p.id 
      FROM public.profiles p
      LEFT JOIN public.notification_settings ns ON ns.user_id = p.id
      WHERE p.id != NEW.user_id
        AND (ns.notify_on_announcement IS NULL OR ns.notify_on_announcement = true)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        target_user_id,
        'announcement',
        'Új globális hír',
        'Új globális hír lett közzétéve: ' || NEW.title,
        '/dashboard'
      );
    END LOOP;
  ELSE
    -- If it's a company announcement, notify users from the same company
    FOR target_user_id IN 
      SELECT p.id 
      FROM public.profiles p
      LEFT JOIN public.notification_settings ns ON ns.user_id = p.id
      WHERE p.company_name = announcement_author_company
        AND p.id != NEW.user_id
        AND (ns.notify_on_announcement IS NULL OR ns.notify_on_announcement = true)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        target_user_id,
        'announcement',
        'Új hír',
        'Új hír lett közzétéve: ' || NEW.title,
        '/dashboard'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;