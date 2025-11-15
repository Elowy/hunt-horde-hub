-- Add hired_hunter_id to hunting_registrations table
ALTER TABLE public.hunting_registrations 
ADD COLUMN hired_hunter_id uuid REFERENCES public.hired_hunters(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX idx_hunting_registrations_hired_hunter_id ON public.hunting_registrations(hired_hunter_id);

-- Update RLS policies to allow viewing registrations with hired hunters
CREATE POLICY "Users can view hired hunter registrations"
ON public.hunting_registrations
FOR SELECT
USING (
  hired_hunter_id IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM public.hired_hunters hh
      WHERE hh.id = hunting_registrations.hired_hunter_id
      AND hh.user_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'editor'::app_role)
  )
);