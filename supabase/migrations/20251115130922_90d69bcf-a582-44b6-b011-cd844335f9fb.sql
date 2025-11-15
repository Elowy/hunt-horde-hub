-- Add temporal and archiving columns to price_settings
ALTER TABLE price_settings
ADD COLUMN valid_from timestamp with time zone NOT NULL DEFAULT now(),
ADD COLUMN valid_to timestamp with time zone,
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_price_settings_valid_dates ON price_settings(user_id, valid_from, valid_to, is_archived);

-- Add columns to animals table for storing price at transport time
ALTER TABLE animals
ADD COLUMN transport_price_per_kg numeric,
ADD COLUMN transport_vat_rate numeric;