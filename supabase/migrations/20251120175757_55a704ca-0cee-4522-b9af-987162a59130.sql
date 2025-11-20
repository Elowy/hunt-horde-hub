-- Add new notification setting for pending animal submissions
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS notify_on_pending_animal boolean DEFAULT true;

-- Create function to notify admins and editors about pending animals
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

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS notify_admins_pending_animal_trigger ON public.pending_animals;

CREATE TRIGGER notify_admins_pending_animal_trigger
AFTER INSERT ON public.pending_animals
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_pending_animal();