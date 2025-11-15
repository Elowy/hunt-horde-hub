-- Add banned_until column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN banned_until timestamp with time zone DEFAULT NULL;

-- Add ban_reason column to store why the user was banned
ALTER TABLE public.profiles 
ADD COLUMN ban_reason text DEFAULT NULL;

-- Create a function to check if user is banned on login
CREATE OR REPLACE FUNCTION public.check_user_ban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user trying to log in is banned
  IF EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = NEW.id 
    AND banned_until IS NOT NULL 
    AND banned_until > NOW()
  ) THEN
    RAISE EXCEPTION 'Ez a fiók jelenleg ki van tiltva. Kérjük, vegye fel a kapcsolatot az adminisztrátorral.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check ban status on authentication
CREATE TRIGGER check_ban_on_auth
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.check_user_ban();

COMMENT ON COLUMN public.profiles.banned_until IS 'Timestamp until the user is banned. NULL means not banned, far future date (2100-01-01) means permanently banned';
COMMENT ON COLUMN public.profiles.ban_reason IS 'Reason why the user was banned';