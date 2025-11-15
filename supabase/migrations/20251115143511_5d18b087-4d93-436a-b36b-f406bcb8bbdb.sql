-- Create announcements table for news/announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and editors can create announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'editor'::app_role)
  );

CREATE POLICY "Authors can update their own announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete their own announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to notify all users about new announcement
CREATE OR REPLACE FUNCTION public.notify_users_new_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  announcement_author_company TEXT;
BEGIN
  -- Get the company of the announcement author
  SELECT company_name INTO announcement_author_company
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notify all users from the same company (except the author)
  FOR target_user_id IN 
    SELECT p.id 
    FROM public.profiles p
    WHERE p.company_name = announcement_author_company
      AND p.id != NEW.user_id
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
  
  RETURN NEW;
END;
$$;

-- Create trigger for new announcements
CREATE TRIGGER on_announcement_created
  AFTER INSERT ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_users_new_announcement();

-- Add updated_at trigger
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();