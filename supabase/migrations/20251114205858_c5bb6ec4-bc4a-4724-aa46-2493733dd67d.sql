-- Add user_type to profiles
ALTER TABLE public.profiles ADD COLUMN user_type TEXT DEFAULT 'hunter_society' CHECK (user_type IN ('hunter_society', 'buyer'));

-- Create transport_documents table
CREATE TABLE public.transport_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_number TEXT NOT NULL,
  transport_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_weight NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  animal_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transport_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transport documents" 
ON public.transport_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transport documents" 
ON public.transport_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transport documents" 
ON public.transport_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create transport_document_items table
CREATE TABLE public.transport_document_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transport_document_id UUID NOT NULL REFERENCES public.transport_documents(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transport_document_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view items of their transport documents"
ON public.transport_document_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transport_documents
    WHERE id = transport_document_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create items for their transport documents"
ON public.transport_document_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transport_documents
    WHERE id = transport_document_id AND user_id = auth.uid()
  )
);

-- Create buyers table (for felvásárlók)
CREATE TABLE public.buyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own buyer profile" 
ON public.buyers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own buyer profile" 
ON public.buyers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buyer profile" 
ON public.buyers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create purchase_offers table
CREATE TABLE public.purchase_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  hunter_society_id UUID NOT NULL,
  species TEXT NOT NULL,
  class TEXT NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  min_quantity NUMERIC,
  max_quantity NUMERIC,
  valid_until TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_offers ENABLE ROW LEVEL SECURITY;

-- Create policies for purchase_offers
CREATE POLICY "Buyers can view their own offers" 
ON public.purchase_offers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.buyers
    WHERE id = buyer_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Hunter societies can view offers for them"
ON public.purchase_offers
FOR SELECT
USING (auth.uid() = hunter_society_id);

CREATE POLICY "Buyers can create their own offers" 
ON public.purchase_offers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.buyers
    WHERE id = buyer_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Buyers can update their own offers" 
ON public.purchase_offers 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.buyers
    WHERE id = buyer_id AND user_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_transport_documents_updated_at
BEFORE UPDATE ON public.transport_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_buyers_updated_at
BEFORE UPDATE ON public.buyers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_purchase_offers_updated_at
BEFORE UPDATE ON public.purchase_offers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();