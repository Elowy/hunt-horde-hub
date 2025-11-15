-- Add VAT rate column to price_settings table
ALTER TABLE public.price_settings 
ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 27;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_price_settings_vat_rate 
ON public.price_settings(vat_rate);