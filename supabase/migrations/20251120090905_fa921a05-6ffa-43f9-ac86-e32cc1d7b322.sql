-- Update handle_new_user function to use hunter_society_members table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
  
  -- Insert profile (without hunter_society_id as we use hunter_society_members now)
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
    -- Set default hunter_category for hunters, NULL for others
    CASE 
      WHEN is_hunter THEN 'tag'::hunter_category
      ELSE NULL
    END,
    -- Hunters need approval, others are auto-approved
    NOT is_hunter
  );
  
  -- If hunter and hunter_society_id provided, add to hunter_society_members table
  IF is_hunter AND hunter_society_uuid IS NOT NULL THEN
    INSERT INTO public.hunter_society_members (hunter_id, hunter_society_id)
    VALUES (new.id, hunter_society_uuid)
    ON CONFLICT (hunter_id, hunter_society_id) DO NOTHING;
  END IF;
  
  return new;
END;
$$;