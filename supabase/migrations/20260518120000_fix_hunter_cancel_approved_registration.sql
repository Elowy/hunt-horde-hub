-- Allow hunters to cancel their own pending OR approved registrations.
-- Previously only pending→cancelled was allowed; this extends it to approved→cancelled.
DROP POLICY IF EXISTS "Hunters can update their own registrations" ON public.hunting_registrations;

CREATE POLICY "Hunters can update their own registrations"
  ON public.hunting_registrations FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('pending', 'approved')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'cancelled'
  );
