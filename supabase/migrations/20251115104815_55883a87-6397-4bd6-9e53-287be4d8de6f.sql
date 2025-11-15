-- Add cooling price and vat rate to storage locations
ALTER TABLE public.storage_locations 
ADD COLUMN cooling_price_per_kg numeric DEFAULT 0,
ADD COLUMN cooling_vat_rate numeric DEFAULT 27;