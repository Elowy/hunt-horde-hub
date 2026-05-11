ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS usage_type text,
  ADD COLUMN IF NOT EXISTS buyer_type text,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_zip text,
  ADD COLUMN IF NOT EXISTS buyer_city text,
  ADD COLUMN IF NOT EXISTS buyer_address text,
  ADD COLUMN IF NOT EXISTS buyer_tax_number text;