-- Drop existing policies for hunting_locations
DROP POLICY IF EXISTS "Users can create their own locations" ON public.hunting_locations;
DROP POLICY IF EXISTS "Users can update their own locations" ON public.hunting_locations;
DROP POLICY IF EXISTS "Users can delete their own locations" ON public.hunting_locations;

-- Create new policies: only admins, editors, super_admins can create, update, delete
CREATE POLICY "Admins, editors, and super admins can create locations"
ON public.hunting_locations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins, editors, and super admins can update locations"
ON public.hunting_locations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins, editors, and super admins can delete locations"
ON public.hunting_locations
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);