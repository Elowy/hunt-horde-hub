-- Add archived column to animals table
ALTER TABLE public.animals 
ADD COLUMN archived BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_animals_archived ON public.animals(archived);

-- Update RLS policies to handle archived animals
-- Allow editors, admins and super admins to update archived status
CREATE POLICY "Editors and admins can archive animals"
ON public.animals
FOR UPDATE
USING (
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);