-- Add is_global column to announcements table
ALTER TABLE public.announcements
ADD COLUMN is_global boolean DEFAULT false;

-- Update RLS policies for announcements to show global announcements to everyone
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;

CREATE POLICY "Users can view their company announcements and global announcements"
ON public.announcements
FOR SELECT
USING (
  is_global = true 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.company_name = get_user_company_name(announcements.user_id)
  )
);

-- Super admins can create global announcements
CREATE POLICY "Super admins can create global announcements"
ON public.announcements
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR 
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  has_role(auth.uid(), 'editor'::app_role)
);