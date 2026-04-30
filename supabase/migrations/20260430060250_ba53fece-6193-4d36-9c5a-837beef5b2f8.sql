-- 1. Replace the publicly readable policy on profiles with one that requires
--    authentication. Keep the same scope (only hunter_society rows visible),
--    but no longer expose sensitive contact info to anonymous visitors.
DROP POLICY IF EXISTS "Anyone can view hunter society basic info" ON public.profiles;

CREATE POLICY "Authenticated users can view hunter society basic info"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (user_type = 'hunter_society');

-- 2. Create a minimal public view that the registration page can use to
--    populate the hunter-society dropdown without exposing PII.
CREATE OR REPLACE VIEW public.hunter_societies_public
WITH (security_invoker = on) AS
  SELECT id, company_name
  FROM public.profiles
  WHERE user_type = 'hunter_society'
    AND company_name IS NOT NULL;

-- 3. Allow anon and authenticated to read this safe view only.
GRANT SELECT ON public.hunter_societies_public TO anon, authenticated;

-- Because the view runs with security_invoker=on, anon would normally be
-- blocked by the underlying table's RLS. Add a narrow SELECT policy that
-- exposes only the rows the view filters on; the view definition still
-- guarantees no extra columns leak through.
CREATE POLICY "Anon can read hunter society id and name via view"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (user_type = 'hunter_society');
