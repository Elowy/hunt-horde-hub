-- Create trigger to automatically assign hunter role when editor role is assigned to a non-admin user
CREATE OR REPLACE FUNCTION public.assign_hunter_role_to_editors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the role being assigned is 'editor' and user belongs to a hunter society
  IF NEW.role = 'editor' THEN
    -- Check if user's profile is of type hunter_society member
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.user_id 
      AND user_type != 'hunter_society'
      AND hunter_society_id IS NOT NULL
    ) THEN
      -- Also assign hunter role if not already assigned
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, 'hunter')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS auto_assign_hunter_role_to_editors ON public.user_roles;
CREATE TRIGGER auto_assign_hunter_role_to_editors
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_hunter_role_to_editors();

-- Add unique constraint to prevent duplicate role assignments
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);