-- Create cooling_prices table for historical price tracking
CREATE TABLE IF NOT EXISTS public.cooling_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id UUID NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cooling_price_per_kg NUMERIC NOT NULL DEFAULT 0,
  cooling_vat_rate NUMERIC NOT NULL DEFAULT 27,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_cooling_prices_storage_location ON public.cooling_prices(storage_location_id);
CREATE INDEX idx_cooling_prices_user ON public.cooling_prices(user_id);
CREATE INDEX idx_cooling_prices_valid_dates ON public.cooling_prices(valid_from, valid_to);
CREATE INDEX idx_cooling_prices_archived ON public.cooling_prices(is_archived);

-- Enable RLS
ALTER TABLE public.cooling_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own cooling prices"
  ON public.cooling_prices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cooling prices"
  ON public.cooling_prices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cooling prices"
  ON public.cooling_prices
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cooling prices"
  ON public.cooling_prices
  FOR DELETE
  USING (auth.uid() = user_id);

-- Migrate existing cooling prices from storage_locations
INSERT INTO public.cooling_prices (
  storage_location_id,
  user_id,
  cooling_price_per_kg,
  cooling_vat_rate,
  valid_from,
  valid_to,
  is_archived
)
SELECT 
  id,
  user_id,
  COALESCE(cooling_price_per_kg, 0),
  COALESCE(cooling_vat_rate, 27),
  created_at,
  NULL,
  false
FROM public.storage_locations
WHERE cooling_price_per_kg IS NOT NULL OR cooling_vat_rate IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER handle_cooling_prices_updated_at
  BEFORE UPDATE ON public.cooling_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.cooling_prices IS 'Historical cooling prices with date ranges for storage locations';
COMMENT ON COLUMN public.cooling_prices.valid_from IS 'Start date when this price becomes valid';
COMMENT ON COLUMN public.cooling_prices.valid_to IS 'End date when this price expires (NULL means currently active)';
COMMENT ON COLUMN public.cooling_prices.is_archived IS 'Whether this price has been archived';

-- Add a column to animals table to store the cooling price used at transport time
ALTER TABLE public.animals 
ADD COLUMN IF NOT EXISTS transport_cooling_price NUMERIC,
ADD COLUMN IF NOT EXISTS transport_cooling_vat_rate NUMERIC;

COMMENT ON COLUMN public.animals.transport_cooling_price IS 'Cooling price per kg at the time of transport';
COMMENT ON COLUMN public.animals.transport_cooling_vat_rate IS 'VAT rate at the time of transport';