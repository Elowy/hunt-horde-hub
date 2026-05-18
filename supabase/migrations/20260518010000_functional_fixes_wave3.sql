-- ==========================================================
-- 3. hullám: funkcionális bugok + DB-validáció
-- F1: frontend fix (Kiiratkozás gomb csak pending-nél)
-- R3: admin+editor INSERT kivétel (cross-tenant safe)
-- D1: bérvadász duplikáció-védelem (partial unique index)
-- V1: 24h maximum constraint (kiegészíti a meglévő valid_duration min 3h-t)
-- ==========================================================

-- R3: Admin és editor más vadász nevében beiratkoztathat.
-- Biztonság: get_user_hunter_society_id(user_id) = get_user_hunter_society_id(auth.uid())
-- garantálja, hogy csak saját társaságon belül lehetséges — cross-tenant rés nincs.
DROP POLICY IF EXISTS "Hunters can create registrations" ON public.hunting_registrations;

CREATE POLICY "Hunters can create registrations"
ON public.hunting_registrations FOR INSERT
WITH CHECK (
  (
    auth.uid() = user_id
    AND (has_role(auth.uid(), 'hunter'::app_role)
         OR has_role(auth.uid(), 'admin'::app_role)
         OR has_role(auth.uid(), 'editor'::app_role))
  )
  OR
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    AND get_user_hunter_society_id(user_id) = get_user_hunter_society_id(auth.uid())
  )
);

-- D1: Bérvadász duplikáció-védelem.
-- Egy bérvadász csak egy aktív (pending/approved) beiratkozással rendelkezhet egyszerre.
-- A rendes vadász unique_active_registration indexét szándékosan távolították el korábban —
-- azt nem állítjuk vissza.
CREATE UNIQUE INDEX unique_active_reg_hired_hunter
ON public.hunting_registrations (hired_hunter_id)
WHERE hired_hunter_id IS NOT NULL AND status IN ('pending', 'approved');

-- V1: 24 óra maximum constraint — kiegészíti a meglévő valid_duration (min 3h) constraint-et.
ALTER TABLE public.hunting_registrations
ADD CONSTRAINT max_duration CHECK (end_time <= start_time + interval '24 hours');
