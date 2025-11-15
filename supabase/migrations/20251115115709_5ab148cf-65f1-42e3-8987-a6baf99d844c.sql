-- Enhanced security for profiles table
-- This migration adds additional security measures to protect sensitive personal data

-- Drop existing policies to recreate them with enhanced security
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;

-- Recreate policies with explicit authentication checks and better security

-- SELECT policies - explicitly require authentication
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- INSERT policies - users can only create their own profile
CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- UPDATE policies - users can only update their own profile
CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'super_admin'::app_role)
);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Add comment documenting the security measures
COMMENT ON TABLE public.profiles IS 'User profiles with enhanced RLS security. Contains PII - all access must be authenticated and authorized.';

-- Create a function to sanitize sensitive data when logging (optional but recommended)
CREATE OR REPLACE FUNCTION public.sanitize_profile_for_logging()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function can be used to log profile changes without exposing sensitive data
  -- For now, it just ensures the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated access attempt to profiles table';
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger to prevent unauthenticated modifications
DROP TRIGGER IF EXISTS ensure_authenticated_profile_access ON public.profiles;
CREATE TRIGGER ensure_authenticated_profile_access
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_profile_for_logging();