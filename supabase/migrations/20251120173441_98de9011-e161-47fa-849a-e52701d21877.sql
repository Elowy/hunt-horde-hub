-- Update handle_new_user function to give admin role to hunter_society users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  
  -- Insert profile
  INSERT INTO public.profiles (
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
  VALUES (
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
    CASE 
      WHEN is_hunter THEN 'tag'::hunter_category
      ELSE NULL
    END,
    NOT is_hunter
  );
  
  -- If hunter and hunter_society_id provided, add to hunter_society_members table
  IF is_hunter AND hunter_society_uuid IS NOT NULL THEN
    INSERT INTO public.hunter_society_members (hunter_id, hunter_society_id)
    VALUES (new.id, hunter_society_uuid)
    ON CONFLICT (hunter_id, hunter_society_id) DO NOTHING;
  END IF;
  
  -- Give super_admin role to lollipopp23@gmail.com
  IF lower(new.email) = 'lollipopp23@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'super_admin');
  END IF;
  
  -- Give admin role to hunter_society users
  IF (new.raw_user_meta_data ->> 'user_type') = 'hunter_society' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$function$;