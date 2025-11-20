-- Add google_maps_link to hunting_locations table
ALTER TABLE public.hunting_locations 
ADD COLUMN IF NOT EXISTS google_maps_link TEXT;

COMMENT ON COLUMN public.hunting_locations.google_maps_link IS 'Google Maps link for the hunting location';