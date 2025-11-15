-- Create security_zone_closures table for temporary zone closures
CREATE TABLE public.security_zone_closures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  security_zone_id uuid NOT NULL REFERENCES public.security_zones(id) ON DELETE CASCADE,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  reason text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_closure_dates CHECK (end_date > start_date)
);

-- Enable RLS
ALTER TABLE public.security_zone_closures ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view closures
CREATE POLICY "All authenticated users can view closures"
ON public.security_zone_closures
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins, editors, and super admins can create closures
CREATE POLICY "Admins and editors can create closures"
ON public.security_zone_closures
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Only admins, editors, and super admins can update closures
CREATE POLICY "Admins and editors can update closures"
ON public.security_zone_closures
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Only admins, editors, and super admins can delete closures
CREATE POLICY "Admins and editors can delete closures"
ON public.security_zone_closures
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create indexes for better performance
CREATE INDEX idx_zone_closures_security_zone ON public.security_zone_closures(security_zone_id);
CREATE INDEX idx_zone_closures_dates ON public.security_zone_closures(start_date, end_date);
CREATE INDEX idx_zone_closures_user ON public.security_zone_closures(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_security_zone_closures_updated_at
BEFORE UPDATE ON public.security_zone_closures
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();