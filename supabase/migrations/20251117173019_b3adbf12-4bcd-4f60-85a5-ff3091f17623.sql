-- Add RLS policy to allow super admins to delete hunting registrations
CREATE POLICY "Super admins can delete all registrations"
ON public.hunting_registrations
FOR DELETE
TO public
USING (has_role(auth.uid(), 'super_admin'::app_role));