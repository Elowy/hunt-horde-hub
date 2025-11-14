-- Add transporter information tables
CREATE TABLE public.transporters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  address TEXT,
  tax_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transporters" 
ON public.transporters 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transporters" 
ON public.transporters 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transporters" 
ON public.transporters 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transporters" 
ON public.transporters 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add transporter specific prices
CREATE TABLE public.transporter_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transporter_id UUID NOT NULL REFERENCES public.transporters(id) ON DELETE CASCADE,
  species TEXT NOT NULL,
  class TEXT NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transporter_id, species, class)
);

-- Enable RLS
ALTER TABLE public.transporter_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view prices for their transporters"
ON public.transporter_prices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transporters
    WHERE id = transporter_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create prices for their transporters"
ON public.transporter_prices
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transporters
    WHERE id = transporter_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update prices for their transporters"
ON public.transporter_prices
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.transporters
    WHERE id = transporter_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete prices for their transporters"
ON public.transporter_prices
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.transporters
    WHERE id = transporter_id AND user_id = auth.uid()
  )
);

-- Add columns to transport_documents
ALTER TABLE public.transport_documents 
ADD COLUMN transporter_id UUID REFERENCES public.transporters(id) ON DELETE SET NULL,
ADD COLUMN transporter_name TEXT,
ADD COLUMN vehicle_plate TEXT,
ADD COLUMN ticket_number TEXT;

-- Add VAT settings to profiles
ALTER TABLE public.profiles ADD COLUMN vat_rate NUMERIC DEFAULT 27;

-- Add triggers
CREATE TRIGGER update_transporters_updated_at
BEFORE UPDATE ON public.transporters
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_transporter_prices_updated_at
BEFORE UPDATE ON public.transporter_prices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();