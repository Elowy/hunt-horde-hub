-- Add is_default column to transporters table
ALTER TABLE public.transporters 
ADD COLUMN is_default BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX idx_transporters_is_default ON public.transporters(user_id, is_default) WHERE is_default = true;

-- Add comment
COMMENT ON COLUMN public.transporters.is_default IS 'Indicates if this transporter is the default choice for the user';