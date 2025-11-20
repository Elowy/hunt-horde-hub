-- Add price_per_unit column to epidemic_measures table
ALTER TABLE epidemic_measures
ADD COLUMN price_per_unit NUMERIC DEFAULT 0 NOT NULL;