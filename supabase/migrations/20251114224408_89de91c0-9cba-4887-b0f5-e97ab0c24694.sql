-- Create settlements table
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add settlement_id to security_zones
ALTER TABLE public.security_zones 
ADD COLUMN IF NOT EXISTS settlement_id uuid REFERENCES public.settlements(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Enable RLS on settlements
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- RLS policies for settlements
CREATE POLICY "Users can view their own settlements"
ON public.settlements FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own settlements"
ON public.settlements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settlements"
ON public.settlements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settlements"
ON public.settlements FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_settlements
BEFORE UPDATE ON public.settlements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();