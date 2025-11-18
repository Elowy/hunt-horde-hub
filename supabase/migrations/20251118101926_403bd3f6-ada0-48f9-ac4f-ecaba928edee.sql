-- Add QR code functionality to storage locations
ALTER TABLE public.storage_locations 
ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS qr_enabled BOOLEAN DEFAULT false;

-- Create pending_animals table for QR code submissions
CREATE TABLE IF NOT EXISTS public.pending_animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id UUID NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  hunter_society_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Basic animal data from submission
  species TEXT NOT NULL,
  gender TEXT,
  hunter_name TEXT,
  notes TEXT,
  
  -- Submission info
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_via TEXT DEFAULT 'qr_code',
  
  -- Approval workflow
  approval_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Data to be filled during approval
  animal_id TEXT,
  weight NUMERIC,
  class TEXT,
  age TEXT,
  condition TEXT,
  cooling_date TIMESTAMP WITH TIME ZONE,
  security_zone_id UUID REFERENCES public.security_zones(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pending_animals
ALTER TABLE public.pending_animals ENABLE ROW LEVEL SECURITY;

-- Anyone can insert via QR code (public submission)
CREATE POLICY "Anyone can submit animals via QR code"
ON public.pending_animals
FOR INSERT
WITH CHECK (approval_status = 'pending');

-- Admins, editors, and super admins can view pending animals from their company
CREATE POLICY "Admins can view pending animals"
ON public.pending_animals
FOR SELECT
USING (
  hunter_society_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'editor'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND company_name = get_user_company_name(pending_animals.hunter_society_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  )
);

-- Admins and editors can update pending animals (for approval/rejection)
CREATE POLICY "Admins can update pending animals"
ON public.pending_animals
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND company_name = get_user_company_name(pending_animals.hunter_society_id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_pending_animals_updated_at
BEFORE UPDATE ON public.pending_animals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();