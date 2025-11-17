-- Fix double notification issue and hunter_society_id assignment

-- Drop the old handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate handle_new_user without duplicate notification
-- The notify_admins_new_registration trigger already handles notifications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_hunter boolean;
  hunter_society_uuid uuid;
BEGIN
  -- Check if user type is hunter
  is_hunter := (new.raw_user_meta_data ->> 'user_type') = 'hunter';
  
  -- Parse hunter_society_id to UUID if it exists and is not empty
  hunter_society_uuid := NULL;
  IF (new.raw_user_meta_data ->> 'hunter_society_id') IS NOT NULL 
     AND (new.raw_user_meta_data ->> 'hunter_society_id') != '' THEN
    BEGIN
      hunter_society_uuid := (new.raw_user_meta_data ->> 'hunter_society_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      hunter_society_uuid := NULL;
    END;
  END IF;
  
  insert into public.profiles (
    id, 
    company_name, 
    contact_name, 
    contact_email, 
    contact_phone, 
    address,
    tax_number,
    user_type,
    hunter_license_number,
    birth_date,
    privacy_policy_accepted,
    privacy_policy_accepted_at,
    hunter_society_id,
    hunter_category,
    registration_approved
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'contact_name',
    new.raw_user_meta_data ->> 'contact_email',
    new.raw_user_meta_data ->> 'contact_phone',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'tax_number',
    new.raw_user_meta_data ->> 'user_type',
    new.raw_user_meta_data ->> 'hunter_license_number',
    CASE 
      WHEN new.raw_user_meta_data ->> 'birth_date' IS NOT NULL 
      THEN (new.raw_user_meta_data ->> 'birth_date')::date 
      ELSE NULL 
    END,
    CASE 
      WHEN new.raw_user_meta_data ->> 'privacy_policy_accepted' = 'true' 
      THEN true 
      ELSE false 
    END,
    CASE 
      WHEN new.raw_user_meta_data ->> 'privacy_policy_accepted' = 'true' 
      THEN now() 
      ELSE NULL 
    END,
    hunter_society_uuid,
    -- Set default hunter_category for hunters, NULL for others
    CASE 
      WHEN is_hunter THEN 'tag'::hunter_category
      ELSE NULL
    END,
    -- Hunters need approval, others are auto-approved
    NOT is_hunter
  );
  
  -- Notification is now handled by notify_admins_new_registration trigger
  -- No need to send duplicate notification here
  
  return new;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();