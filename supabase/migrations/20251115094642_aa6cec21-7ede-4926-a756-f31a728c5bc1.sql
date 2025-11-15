-- Add new columns to animals table for location and veterinary details
ALTER TABLE public.animals 
  ADD COLUMN IF NOT EXISTS security_zone_id uuid REFERENCES public.security_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vet_sample_id text,
  ADD COLUMN IF NOT EXISTS vet_doctor_name text,
  ADD COLUMN IF NOT EXISTS vet_result text CHECK (vet_result IN ('positive', 'negative', 'pozitív', 'negatív', NULL));

-- Add comment to explain the columns
COMMENT ON COLUMN public.animals.security_zone_id IS 'Link to the security zone (settlement and zone) where the animal was hunted';
COMMENT ON COLUMN public.animals.vet_sample_id IS 'Veterinary sample ID number';
COMMENT ON COLUMN public.animals.vet_doctor_name IS 'Name of the veterinarian who performed the examination';
COMMENT ON COLUMN public.animals.vet_result IS 'Result of veterinary examination (positive/negative)';