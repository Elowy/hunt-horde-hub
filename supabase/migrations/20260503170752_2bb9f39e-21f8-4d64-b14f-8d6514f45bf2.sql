ALTER TABLE public.cooling_prices
  ADD COLUMN IF NOT EXISTS species text,
  ADD COLUMN IF NOT EXISTS class text;

CREATE INDEX IF NOT EXISTS idx_cooling_prices_species_class
  ON public.cooling_prices(storage_location_id, species, class);

COMMENT ON COLUMN public.cooling_prices.species IS 'Optional species filter (matches animals.species). NULL = applies to all species (default).';
COMMENT ON COLUMN public.cooling_prices.class IS 'Optional class filter (matches animals.class). NULL = applies to all classes (default).';