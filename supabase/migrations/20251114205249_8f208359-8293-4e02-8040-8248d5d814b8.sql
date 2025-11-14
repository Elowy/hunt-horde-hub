-- Create price settings table for storing prices per species and class
CREATE TABLE public.price_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  species TEXT NOT NULL,
  class TEXT NOT NULL,
  price_per_kg NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, species, class)
);

-- Enable RLS
ALTER TABLE public.price_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own price settings" 
ON public.price_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own price settings" 
ON public.price_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price settings" 
ON public.price_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price settings" 
ON public.price_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_price_settings_updated_at
BEFORE UPDATE ON public.price_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();