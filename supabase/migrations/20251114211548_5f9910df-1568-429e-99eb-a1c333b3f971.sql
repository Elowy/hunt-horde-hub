-- Add is_transported flag to animals table
ALTER TABLE public.animals ADD COLUMN is_transported BOOLEAN DEFAULT false;
ALTER TABLE public.animals ADD COLUMN transported_at TIMESTAMP WITH TIME ZONE;