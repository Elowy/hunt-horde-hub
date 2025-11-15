-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to notify admins/editors about new registration requests
CREATE OR REPLACE FUNCTION notify_admins_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Only notify for pending registrations that require approval
  IF NEW.status = 'pending' AND NEW.requires_admin_approval = true THEN
    -- Get all admin and editor user IDs
    FOR admin_id IN 
      SELECT DISTINCT user_id 
      FROM public.user_roles 
      WHERE role IN ('admin', 'editor')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        admin_id,
        'registration_pending',
        'Új beiratkozási kérelem',
        CASE 
          WHEN NEW.is_guest THEN 'Új vendég beiratkozási kérelem érkezett jóváhagyásra.'
          ELSE 'Új vadász beiratkozási kérelem érkezett jóváhagyásra.'
        END,
        '/hunting-registrations'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new registrations
CREATE TRIGGER on_registration_created
  AFTER INSERT ON public.hunting_registrations
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_registration();

-- Create function to notify user when registration is approved
CREATE OR REPLACE FUNCTION notify_user_registration_approved()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify when status changes from pending to approved
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'registration_approved',
      'Beiratkozás jóváhagyva',
      'A beiratkozási kérelme jóváhagyásra került.',
      '/hunting-registrations'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for registration approval
CREATE TRIGGER on_registration_approved
  AFTER UPDATE ON public.hunting_registrations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_user_registration_approved();

-- Add updated_at trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();