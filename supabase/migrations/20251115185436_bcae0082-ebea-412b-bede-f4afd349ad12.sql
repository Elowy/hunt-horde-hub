-- Create map_zones table for storing drawn polygons
CREATE TABLE IF NOT EXISTS public.map_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  geojson JSONB NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create map_pois table for storing points of interest
CREATE TABLE IF NOT EXISTS public.map_pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  zone_id UUID REFERENCES public.map_zones(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add map_zone_id to hunting_registrations
ALTER TABLE public.hunting_registrations
ADD COLUMN IF NOT EXISTS map_zone_id UUID REFERENCES public.map_zones(id) ON DELETE SET NULL;

-- Enable RLS on map_zones
ALTER TABLE public.map_zones ENABLE ROW LEVEL SECURITY;

-- Enable RLS on map_pois
ALTER TABLE public.map_pois ENABLE ROW LEVEL SECURITY;

-- RLS policies for map_zones
CREATE POLICY "Users can view their own zones"
  ON public.map_zones FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own zones"
  ON public.map_zones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own zones"
  ON public.map_zones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own zones"
  ON public.map_zones FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for map_pois
CREATE POLICY "Users can view their own POIs"
  ON public.map_pois FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own POIs"
  ON public.map_pois FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own POIs"
  ON public.map_pois FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own POIs"
  ON public.map_pois FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_map_zones_user_id ON public.map_zones(user_id);
CREATE INDEX IF NOT EXISTS idx_map_pois_user_id ON public.map_pois(user_id);
CREATE INDEX IF NOT EXISTS idx_map_pois_zone_id ON public.map_pois(zone_id);
CREATE INDEX IF NOT EXISTS idx_hunting_registrations_map_zone_id ON public.hunting_registrations(map_zone_id);

-- Create trigger for updated_at on map_zones
CREATE TRIGGER update_map_zones_updated_at
  BEFORE UPDATE ON public.map_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on map_pois
CREATE TRIGGER update_map_pois_updated_at
  BEFORE UPDATE ON public.map_pois
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to check if a point is inside a polygon (point-in-polygon)
CREATE OR REPLACE FUNCTION public.point_in_polygon(
  lat NUMERIC,
  lng NUMERIC,
  polygon JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  coordinates JSONB;
  point_count INTEGER;
  i INTEGER;
  j INTEGER;
  xi NUMERIC;
  yi NUMERIC;
  xj NUMERIC;
  yj NUMERIC;
  is_inside BOOLEAN := FALSE;
BEGIN
  -- Extract coordinates from GeoJSON
  coordinates := polygon->'geometry'->'coordinates'->0;
  point_count := jsonb_array_length(coordinates);
  
  -- Ray casting algorithm
  j := point_count - 1;
  FOR i IN 0..point_count-1 LOOP
    xi := (coordinates->i->0)::NUMERIC;
    yi := (coordinates->i->1)::NUMERIC;
    xj := (coordinates->j->0)::NUMERIC;
    yj := (coordinates->j->1)::NUMERIC;
    
    IF ((yi > lat) != (yj > lat)) AND 
       (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) THEN
      is_inside := NOT is_inside;
    END IF;
    
    j := i;
  END LOOP;
  
  RETURN is_inside;
END;
$$ LANGUAGE plpgsql IMMUTABLE;