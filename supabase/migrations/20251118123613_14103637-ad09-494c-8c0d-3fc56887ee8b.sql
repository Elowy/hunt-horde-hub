-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create qr_codes table for managing both storage location and guest registration QR codes
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('storage_location', 'guest_registration')),
  name TEXT NOT NULL,
  storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own QR codes"
  ON public.qr_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own QR codes"
  ON public.qr_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own QR codes"
  ON public.qr_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own QR codes"
  ON public.qr_codes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX idx_qr_codes_user_id ON public.qr_codes(user_id);
CREATE INDEX idx_qr_codes_type ON public.qr_codes(type);

-- Create trigger for updated_at
CREATE TRIGGER update_qr_codes_updated_at
  BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add policy to allow anyone to read active, non-expired QR codes (for QR code validation)
CREATE POLICY "Anyone can read active non-expired QR codes"
  ON public.qr_codes
  FOR SELECT
  USING (
    is_active = true AND
    (expires_at IS NULL OR expires_at > now())
  );