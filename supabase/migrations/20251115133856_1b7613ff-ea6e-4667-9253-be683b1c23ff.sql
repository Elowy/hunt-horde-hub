-- Create hunter category enum
CREATE TYPE public.hunter_category AS ENUM (
  'tag',
  'vendeg',
  'bervadasz',
  'ib_vendeg',
  'trofeas_vadasz',
  'egyeb'
);

-- Add hunter_category column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hunter_category public.hunter_category DEFAULT 'tag';

-- Update the hunting_registrations SELECT policy for hunters to only see their own
DROP POLICY IF EXISTS "Users, editors, and hunters can view animals" ON public.animals;

CREATE POLICY "Hunters can only view their own registrations' animals"
ON public.animals
FOR SELECT
USING (
  (hunting_registration_id IS NOT NULL) 
  AND (
    EXISTS (
      SELECT 1
      FROM hunting_registrations hr
      WHERE hr.id = animals.hunting_registration_id
      AND (
        hr.user_id = auth.uid() 
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'editor'::app_role)
        OR (hr.is_guest = false AND has_role(auth.uid(), 'super_admin'::app_role))
      )
    )
  )
);

-- Add comment to explain hunter categories
COMMENT ON COLUMN public.profiles.hunter_category IS 'Vadász kategória: tag, vendeg, bervadasz, ib_vendeg, trofeas_vadasz, egyeb';