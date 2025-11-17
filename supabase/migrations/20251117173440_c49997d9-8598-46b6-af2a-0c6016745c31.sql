-- Drop the old unique constraint that doesn't allow archived duplicates
ALTER TABLE public.price_settings 
DROP CONSTRAINT IF EXISTS price_settings_user_id_species_class_key;

-- Create a partial unique index that only applies to non-archived (active) prices
-- This allows multiple archived prices for the same user_id, species, class combination
-- but ensures only one active price exists
CREATE UNIQUE INDEX price_settings_active_unique 
ON public.price_settings (user_id, species, class) 
WHERE is_archived = false;

-- Add comment for documentation
COMMENT ON INDEX price_settings_active_unique IS 'Ensures only one active (non-archived) price exists per user, species, and class combination';