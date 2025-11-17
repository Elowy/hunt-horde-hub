-- Create buyer price proposals table for custom price offers
CREATE TABLE IF NOT EXISTS public.buyer_price_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  hunter_society_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species TEXT NOT NULL,
  class TEXT NOT NULL,
  price_per_kg NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(buyer_id, hunter_society_id, species, class, status)
);

-- Enable RLS
ALTER TABLE public.buyer_price_proposals ENABLE ROW LEVEL SECURITY;

-- Buyers can create and view their own proposals
CREATE POLICY "Buyers can create their own proposals"
  ON public.buyer_price_proposals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buyers
      WHERE buyers.id = buyer_price_proposals.buyer_id
      AND buyers.user_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can view their own proposals"
  ON public.buyer_price_proposals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.buyers
      WHERE buyers.id = buyer_price_proposals.buyer_id
      AND buyers.user_id = auth.uid()
    )
  );

-- Hunter society admins can view and update proposals for their society
CREATE POLICY "Hunter society admins can view proposals for their society"
  ON public.buyer_price_proposals
  FOR SELECT
  USING (
    hunter_society_id = auth.uid()
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Hunter society admins can update proposals for their society"
  ON public.buyer_price_proposals
  FOR UPDATE
  USING (
    hunter_society_id = auth.uid()
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Super admins can view all proposals
CREATE POLICY "Super admins can view all proposals"
  ON public.buyer_price_proposals
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_buyer_price_proposals_updated_at
  BEFORE UPDATE ON public.buyer_price_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create notification trigger for new proposals
CREATE OR REPLACE FUNCTION public.notify_hunter_society_new_price_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  buyer_name TEXT;
BEGIN
  -- Get buyer company name
  SELECT company_name INTO buyer_name
  FROM public.buyers
  WHERE id = NEW.buyer_id;

  -- Notify all admins of the hunter society
  FOR admin_id IN 
    SELECT ur.user_id 
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE ur.role = 'admin'
    AND p.id = NEW.hunter_society_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      admin_id,
      'price_proposal_received',
      'Új árjavaslat érkezett',
      buyer_name || ' árjavaslat küldött: ' || NEW.species || ' - ' || NEW.class,
      '/dashboard'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_price_proposal_created
  AFTER INSERT ON public.buyer_price_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_hunter_society_new_price_proposal();

-- Create notification trigger when proposal is accepted
CREATE OR REPLACE FUNCTION public.notify_buyer_proposal_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_user_id UUID;
  society_name TEXT;
BEGIN
  -- Only notify when status changes to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get buyer user_id
    SELECT user_id INTO buyer_user_id
    FROM public.buyers
    WHERE id = NEW.buyer_id;
    
    -- Get hunter society name
    SELECT company_name INTO society_name
    FROM public.profiles
    WHERE id = NEW.hunter_society_id;
    
    -- Notify buyer
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      buyer_user_id,
      'price_proposal_accepted',
      'Árjavaslat elfogadva',
      society_name || ' elfogadta az árjavaslat: ' || NEW.species || ' - ' || NEW.class,
      '/dashboard'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_price_proposal_status_changed
  AFTER UPDATE ON public.buyer_price_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_buyer_proposal_accepted();