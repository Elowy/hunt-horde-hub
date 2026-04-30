-- Revoke EXECUTE from authenticated for ALL SECURITY DEFINER functions in public,
-- then re-grant only to those that legitimately need to be callable by clients
-- or referenced inside RLS policies evaluated for authenticated users.

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
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated;',
      r.schema_name, r.func_name, r.args
    );
  END LOOP;
END;
$$;

-- Re-grant EXECUTE on functions that must be callable from RLS policies
-- (evaluated as the authenticated user) or from the client as RPC.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_hunter_society_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_hunter_to_society(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.point_in_polygon(numeric, numeric, jsonb) TO authenticated;
