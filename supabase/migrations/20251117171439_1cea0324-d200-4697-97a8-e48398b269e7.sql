-- Fix function search_path for security
-- Add search_path to point_in_polygon function
CREATE OR REPLACE FUNCTION public.point_in_polygon(lat numeric, lng numeric, polygon jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Add search_path to ensure_single_default_location function
CREATE OR REPLACE FUNCTION public.ensure_single_default_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other locations for this user to false
    UPDATE public.storage_locations
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;