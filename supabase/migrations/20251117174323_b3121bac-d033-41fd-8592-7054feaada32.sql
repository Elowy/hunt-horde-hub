-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS ensure_authenticated_profile_access ON public.profiles;
DROP FUNCTION IF EXISTS public.sanitize_profile_for_logging();