-- Update function to also send email notifications via edge function
CREATE OR REPLACE FUNCTION public.notify_admins_pending_animal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  hunter_society_name TEXT;
  http_response jsonb;
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

    -- Send email notification via edge function (fire and forget)
    -- Using pg_net extension to make async HTTP call
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.api_url') || '/functions/v1/send-pending-animal-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object('pendingAnimalId', NEW.id::text)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Failed to send email notification for pending animal: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;