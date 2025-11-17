-- Add buyer_id to transport_documents table
ALTER TABLE public.transport_documents 
ADD COLUMN buyer_id uuid REFERENCES public.buyers(id);

-- Create index for better query performance
CREATE INDEX idx_transport_documents_buyer_id ON public.transport_documents(buyer_id);

-- Add RLS policy for buyers to view their transport documents
CREATE POLICY "Buyers can view their transport documents"
ON public.transport_documents
FOR SELECT
USING (
  buyer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.buyers
    WHERE buyers.id = transport_documents.buyer_id
    AND buyers.user_id = auth.uid()
  )
);

-- Create trigger to notify buyers when new transport document is created
CREATE OR REPLACE FUNCTION public.notify_buyer_new_transport_document()
RETURNS TRIGGER AS $$
DECLARE
  buyer_user_id UUID;
  hunter_society_name TEXT;
BEGIN
  -- Only notify if buyer_id is set
  IF NEW.buyer_id IS NOT NULL THEN
    -- Get buyer's user_id
    SELECT user_id INTO buyer_user_id
    FROM public.buyers
    WHERE id = NEW.buyer_id;
    
    -- Get hunter society name
    SELECT company_name INTO hunter_society_name
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Create notification for buyer
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      buyer_user_id,
      'transport_created',
      'Új elszállító dokumentum',
      hunter_society_name || ' új elszállító dokumentumot készített: ' || NEW.document_number,
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_notify_buyer_new_transport_document
AFTER INSERT ON public.transport_documents
FOR EACH ROW
EXECUTE FUNCTION public.notify_buyer_new_transport_document();