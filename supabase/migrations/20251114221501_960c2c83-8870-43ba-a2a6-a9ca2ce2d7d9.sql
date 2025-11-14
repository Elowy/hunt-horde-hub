-- Add tax_number to profiles table
ALTER TABLE public.profiles 
ADD COLUMN tax_number TEXT;

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update animals table RLS policies for role-based access
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create their own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can delete their own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can update their own animals" ON public.animals;
DROP POLICY IF EXISTS "Users can view their own animals" ON public.animals;

-- Create new role-based policies
CREATE POLICY "Users and editors can view animals"
ON public.animals
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'editor')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users, editors and admins can create animals"
ON public.animals
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'editor')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only owners and admins can update animals"
ON public.animals
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only owners and admins can delete animals"
ON public.animals
FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'editor',
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Invitations policies
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view invitations they sent"
ON public.invitations
FOR SELECT
USING (auth.uid() = invited_by);

-- Function to automatically assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- If first user, make them admin, otherwise they'll need an invitation
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to assign role on user creation
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_role();

COMMENT ON TABLE public.user_roles IS 'Stores user roles for access control';
COMMENT ON TABLE public.invitations IS 'Stores email invitations for new users';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check if user has a specific role';