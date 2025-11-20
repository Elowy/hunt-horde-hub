-- Add shooting_date column to animals table
ALTER TABLE public.animals ADD COLUMN shooting_date timestamp with time zone;

-- Remove condition column from animals table
ALTER TABLE public.animals DROP COLUMN IF EXISTS condition;

-- Add shooting_date column to pending_animals table
ALTER TABLE public.pending_animals ADD COLUMN shooting_date timestamp with time zone;

-- Remove condition column from pending_animals table
ALTER TABLE public.pending_animals DROP COLUMN IF EXISTS condition;