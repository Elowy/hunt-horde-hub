-- Step 2: Assign super_admin role and create policies

-- Function to assign super_admin role to specific email
CREATE OR REPLACE FUNCTION public.assign_super_admin()
RETURNS void AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user id from auth.users where email = 'lollipopp23@gmail.com'
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'lollipopp23@gmail.com';
  
  -- If user exists, add super_admin role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Execute the function to assign super_admin role
SELECT public.assign_super_admin();

-- Drop the function as it's no longer needed
DROP FUNCTION public.assign_super_admin();

-- Update RLS policies to allow super_admin access to all data

-- Profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Animals
CREATE POLICY "Super admins can view all animals"
ON public.animals FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all animals"
ON public.animals FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Storage locations
CREATE POLICY "Super admins can view all storage locations"
ON public.storage_locations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all storage locations"
ON public.storage_locations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Transporters
CREATE POLICY "Super admins can view all transporters"
ON public.transporters FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all transporters"
ON public.transporters FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Transport documents
CREATE POLICY "Super admins can view all transport documents"
ON public.transport_documents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all transport documents"
ON public.transport_documents FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Security zones
CREATE POLICY "Super admins can manage all security zones"
ON public.security_zones FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Settlements
CREATE POLICY "Super admins can manage all settlements"
ON public.settlements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- User roles
CREATE POLICY "Super admins can manage all user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Invitations
CREATE POLICY "Super admins can manage all invitations"
ON public.invitations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));