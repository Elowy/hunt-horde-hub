-- Add hunting_registration_id to animals table to link animals to hunting registrations
ALTER TABLE public.animals 
ADD COLUMN hunting_registration_id uuid REFERENCES public.hunting_registrations(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_animals_hunting_registration_id ON public.animals(hunting_registration_id);

-- Add unique constraint to ensure one animal can only be assigned to one registration
CREATE UNIQUE INDEX idx_animals_one_registration ON public.animals(id) WHERE hunting_registration_id IS NOT NULL;

-- Update RLS policies to allow viewing animals assigned to registrations
CREATE POLICY "Users can view animals in their registrations"
ON public.animals
FOR SELECT
USING (
  hunting_registration_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.hunting_registrations hr
    WHERE hr.id = animals.hunting_registration_id
    AND (hr.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);