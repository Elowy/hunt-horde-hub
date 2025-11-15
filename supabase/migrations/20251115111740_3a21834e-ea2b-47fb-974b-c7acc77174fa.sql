-- Create hired_hunters table for contract/hired hunters
CREATE TABLE public.hired_hunters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  license_number text,
  phone text,
  email text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hired_hunters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and editors can manage hired hunters"
ON public.hired_hunters
FOR ALL
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role)
)
WITH CHECK (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'editor'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_hired_hunters_updated_at
BEFORE UPDATE ON public.hired_hunters
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add index for better performance
CREATE INDEX idx_hired_hunters_user_id ON public.hired_hunters(user_id);