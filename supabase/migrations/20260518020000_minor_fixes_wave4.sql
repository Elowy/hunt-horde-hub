-- ==========================================================
-- 4. hullám: minor finomítások
-- R6: DELETE policy TO public → TO authenticated
-- V2: 24h előre foglalási korlát (NOT VALID — meglévő sorok nem validálva)
-- ==========================================================

-- R6: Szemantikai pontosítás — az anon userekre a USING clause amúgy is false-t ad,
-- de a TO authenticated explicit és audit-tiszta.
DROP POLICY IF EXISTS "Super admins can delete all registrations" ON public.hunting_registrations;

CREATE POLICY "Super admins can delete all registrations"
  ON public.hunting_registrations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- V2: Legfeljebb 3 nappal előre lehet beiratkozni.
-- NOT VALID: az új INSERT/UPDATE-ekre azonnal érvényes, a meglévő sorokat
-- nem validálja (elkerüli a hibát ha van régi, most már >3 nap jövőbeli beiratkozás).
-- Kézi validáció: ALTER TABLE public.hunting_registrations VALIDATE CONSTRAINT max_advance_booking;
ALTER TABLE public.hunting_registrations
  ADD CONSTRAINT max_advance_booking
  CHECK (start_time <= now() + interval '3 days') NOT VALID;
