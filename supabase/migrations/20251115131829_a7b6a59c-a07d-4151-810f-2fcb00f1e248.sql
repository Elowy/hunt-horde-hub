-- Create enum for hunting location types
CREATE TYPE public.hunting_location_type AS ENUM (
  'fedett_les',
  'nem_fedett_les',
  'magan_szoro',
  'kozponti_szoro',
  'csapda'
);

-- Create hunting_locations table
CREATE TABLE public.hunting_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type hunting_location_type NOT NULL,
  security_zone_id uuid NOT NULL REFERENCES public.security_zones(id) ON DELETE CASCADE,
  latitude numeric,
  longitude numeric,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for hunting_locations
ALTER TABLE public.hunting_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own locations"
ON public.hunting_locations
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hunter'::app_role));

CREATE POLICY "Users can create their own locations"
ON public.hunting_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations"
ON public.hunting_locations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations"
ON public.hunting_locations
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all locations"
ON public.hunting_locations
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add hunting_location_id to hunting_registrations
ALTER TABLE public.hunting_registrations
ADD COLUMN hunting_location_id uuid REFERENCES public.hunting_locations(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_hunting_locations_security_zone ON public.hunting_locations(security_zone_id);
CREATE INDEX idx_hunting_locations_user ON public.hunting_locations(user_id);
CREATE INDEX idx_hunting_registrations_location ON public.hunting_registrations(hunting_location_id);

-- Add trigger for updated_at
CREATE TRIGGER update_hunting_locations_updated_at
BEFORE UPDATE ON public.hunting_locations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();