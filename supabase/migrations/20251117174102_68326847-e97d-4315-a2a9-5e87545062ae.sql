-- Update handle_new_user function to handle all user types properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_hunter boolean;
BEGIN
  -- Check if user type is hunter
  is_hunter := (new.raw_user_meta_data ->> 'user_type') = 'hunter';
  
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
    CASE 
      WHEN new.raw_user_meta_data ->> 'hunter_society_id' IS NOT NULL 
      THEN (new.raw_user_meta_data ->> 'hunter_society_id')::uuid 
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
  
  -- If hunter registration, notify admins
  IF is_hunter THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT 
      ur.user_id,
      'hunter_registration_pending',
      'Új vadász regisztráció',
      'Új vadász regisztráció érkezett jóváhagyásra: ' || (new.raw_user_meta_data ->> 'contact_name'),
      '/users'
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'super_admin', 'editor');
  END IF;
  
  return new;
END;
$$;