-- ==========================================================
-- 2. hullám: multi-tenant izoláció — R5 + R7
-- R4 (anon policy-k): változatlan marad, 3. körben lesz.
-- ==========================================================

-- R5: hunting_locations SELECT policy javítás.
-- Eredeti: has_role('hunter') elég volt — nincs társaság szűrés.
-- Fix: a hunter-ág get_user_hunter_society_id(auth.uid()) = user_id feltétellel szűr.
-- (hunting_locations.user_id = az aki létrehozta = a society admin profile id-ja)
DROP POLICY IF EXISTS "Users can view their own locations" ON public.hunting_locations;

CREATE POLICY "Users can view their own locations"
ON public.hunting_locations
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'hunter'::app_role)
    AND get_user_hunter_society_id(auth.uid()) = user_id
  )
);

-- R7: notify_admins_new_registration — csak a beiratkozás körzetének
-- társaságához tartozó adminok/szerkesztők kapnak értesítést.
-- A társaság azonosítója: security_zones.user_id (= a society admin profilja).
-- Szűrés: p.hunter_society_id = zone_owner_id (tagok) VAGY p.id = zone_owner_id (maga az admin).
CREATE OR REPLACE FUNCTION notify_admins_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  admin_id      UUID;
  zone_owner_id UUID;
BEGIN
  IF NEW.status = 'pending' AND NEW.requires_admin_approval = true THEN
    SELECT sz.user_id INTO zone_owner_id
    FROM public.security_zones sz
    WHERE sz.id = NEW.security_zone_id;

    FOR admin_id IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.role IN ('admin', 'editor')
        AND (p.hunter_society_id = zone_owner_id OR p.id = zone_owner_id)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        admin_id,
        'registration_pending',
        'Új beiratkozási kérelem',
        CASE
          WHEN NEW.is_guest THEN 'Új vendég beiratkozási kérelem érkezett jóváhagyásra.'
          ELSE 'Új vadász beiratkozási kérelem érkezett jóváhagyásra.'
        END,
        '/hunting-registrations'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
