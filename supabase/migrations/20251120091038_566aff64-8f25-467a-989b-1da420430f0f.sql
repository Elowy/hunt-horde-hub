-- Extend hunter_category enum with new categories
ALTER TYPE public.hunter_category ADD VALUE IF NOT EXISTS 'ib_vendeg';
ALTER TYPE public.hunter_category ADD VALUE IF NOT EXISTS 'trofeas_vadasz';
ALTER TYPE public.hunter_category ADD VALUE IF NOT EXISTS 'egyeb';

-- Create hunter feature permissions table
CREATE TABLE IF NOT EXISTS public.hunter_feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_society_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hunter_category public.hunter_category NOT NULL,
  allow_registrations BOOLEAN NOT NULL DEFAULT true,
  allow_view_cooled_animals BOOLEAN NOT NULL DEFAULT true,
  allow_reserve_animals BOOLEAN NOT NULL DEFAULT true,
  allow_view_statistics BOOLEAN NOT NULL DEFAULT true,
  allow_view_announcements BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hunter_society_id, hunter_category)
);

-- Enable RLS on hunter_feature_permissions
ALTER TABLE public.hunter_feature_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for hunter_feature_permissions
CREATE POLICY "Hunter society admins can manage their feature permissions"
ON public.hunter_feature_permissions
FOR ALL
TO authenticated
USING (
  auth.uid() = hunter_society_id 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  auth.uid() = hunter_society_id 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

CREATE POLICY "Hunters can view their society's feature permissions"
ON public.hunter_feature_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hunter_society_members
    WHERE hunter_id = auth.uid()
    AND hunter_society_id = hunter_feature_permissions.hunter_society_id
  )
);

-- Add hunter_categories to announcements
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS hunter_categories public.hunter_category[] DEFAULT NULL;