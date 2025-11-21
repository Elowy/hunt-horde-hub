-- Create default hunter feature permissions for all existing hunting societies
INSERT INTO public.hunter_feature_permissions (hunter_society_id, hunter_category, allow_registrations, allow_view_cooled_animals, allow_reserve_animals, allow_view_statistics, allow_view_announcements)
SELECT 
  p.id as hunter_society_id,
  category.value as hunter_category,
  true as allow_registrations,
  true as allow_view_cooled_animals,
  true as allow_reserve_animals,
  true as allow_view_statistics,
  true as allow_view_announcements
FROM public.profiles p
CROSS JOIN (
  SELECT unnest(enum_range(NULL::hunter_category)) as value
) category
WHERE p.user_type = 'hunter_society'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.hunter_feature_permissions hfp 
    WHERE hfp.hunter_society_id = p.id 
      AND hfp.hunter_category = category.value
  )
ON CONFLICT (hunter_society_id, hunter_category) DO NOTHING;

-- Create function to initialize permissions for new hunter societies
CREATE OR REPLACE FUNCTION public.initialize_hunter_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only for new hunter_society profiles
  IF NEW.user_type = 'hunter_society' THEN
    -- Insert default permissions for all hunter categories
    INSERT INTO public.hunter_feature_permissions (
      hunter_society_id, 
      hunter_category,
      allow_registrations,
      allow_view_cooled_animals,
      allow_reserve_animals,
      allow_view_statistics,
      allow_view_announcements
    )
    SELECT 
      NEW.id,
      category,
      true,
      true,
      true,
      true,
      true
    FROM unnest(enum_range(NULL::hunter_category)) as category
    ON CONFLICT (hunter_society_id, hunter_category) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to initialize permissions for new hunter societies
DROP TRIGGER IF EXISTS initialize_hunter_permissions_trigger ON public.profiles;
CREATE TRIGGER initialize_hunter_permissions_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_hunter_permissions();