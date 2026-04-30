-- 1. Tighten overly permissive INSERT policies. Replace WITH CHECK (true) policies
--    that target the public/authenticated/anon roles with policies restricted to
--    the service_role. Triggers run as SECURITY DEFINER (function owner) and
--    bypass RLS, so legitimate inserts coming from triggers continue to work.

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
CREATE POLICY "System can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert login history" ON public.user_login_history;
CREATE POLICY "System can insert login history"
  ON public.user_login_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Revoke EXECUTE from anon (and PUBLIC) on every SECURITY DEFINER function
--    in the public schema. Authenticated users keep access where they had it,
--    triggers keep working (they run as the function owner regardless of GRANTs).
--    add_hunter_to_society additionally restricted to authenticated only.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;',
      r.schema_name, r.func_name, r.args
    );
  END LOOP;
END;
$$;

-- 3. Lock down the admin helper so only authenticated users can call it
--    (the function itself enforces admin role internally).
REVOKE EXECUTE ON FUNCTION public.add_hunter_to_society(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_hunter_to_society(uuid, uuid) TO authenticated;
