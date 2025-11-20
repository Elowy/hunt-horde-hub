-- Simplify trigger to only handle in-app notifications
-- Email notifications are handled by the application after insert
CREATE OR REPLACE FUNCTION public.notify_admins_pending_animal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  hunter_society_name TEXT;
BEGIN
  -- Only notify for new pending animals
  IF TG_OP = 'INSERT' AND NEW.approval_status = 'pending' THEN
    -- Get hunter society name
    SELECT company_name INTO hunter_society_name
    FROM public.profiles
    WHERE id = NEW.hunter_society_id;
    
    -- Notify all admins and editors of the hunter society
    FOR admin_id IN 
      SELECT ur.user_id 
      FROM public.user_roles ur
      JOIN public.profiles p ON ur.user_id = p.id
      LEFT JOIN public.notification_settings ns ON ns.user_id = ur.user_id
      WHERE (ur.role = 'admin' OR ur.role = 'editor')
      AND p.id = NEW.hunter_society_id
      AND (ns.notify_on_pending_animal IS NULL OR ns.notify_on_pending_animal = true)
    LOOP
      -- Create in-app notification
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        admin_id,
        'pending_animal_submitted',
        'Új állat jóváhagyásra vár',
        CASE 
          WHEN NEW.species IS NOT NULL THEN 'Új ' || NEW.species || ' került regisztrációra QR kód segítségével. Jóváhagyás szükséges.'
          ELSE 'Új állat került regisztrációra QR kód segítségével. Jóváhagyás szükséges.'
        END,
        '/pending-animals'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;