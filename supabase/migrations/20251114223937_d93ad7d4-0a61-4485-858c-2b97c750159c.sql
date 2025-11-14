-- Biztonsági körzetek tábla
CREATE TABLE public.security_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vadászati beiratkozások tábla
CREATE TABLE public.hunting_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  security_zone_id UUID NOT NULL REFERENCES public.security_zones(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requires_admin_approval BOOLEAN NOT NULL DEFAULT false,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_duration CHECK (end_time >= start_time + interval '3 hours')
);

-- RLS engedélyezése
ALTER TABLE public.security_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunting_registrations ENABLE ROW LEVEL SECURITY;

-- Security zones policies
CREATE POLICY "Users can view their own zones"
ON public.security_zones FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own zones"
ON public.security_zones FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own zones"
ON public.security_zones FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own zones"
ON public.security_zones FOR DELETE
USING (auth.uid() = user_id);

-- Hunting registrations policies
CREATE POLICY "Users and admins can view registrations"
ON public.hunting_registrations FOR SELECT
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.security_zones sz 
    WHERE sz.id = hunting_registrations.security_zone_id 
    AND sz.user_id = auth.uid()
  )
);

CREATE POLICY "Hunters can create registrations"
ON public.hunting_registrations FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  (has_role(auth.uid(), 'hunter'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Users can update their own pending registrations"
ON public.hunting_registrations FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update all registrations"
ON public.hunting_registrations FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own pending registrations"
ON public.hunting_registrations FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');

-- Trigger az updated_at frissítéséhez
CREATE TRIGGER update_security_zones_updated_at
BEFORE UPDATE ON public.security_zones
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_hunting_registrations_updated_at
BEFORE UPDATE ON public.hunting_registrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Függvény az átfedések ellenőrzéséhez
CREATE OR REPLACE FUNCTION public.check_hunting_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  -- Ellenőrizzük, hogy van-e átfedés más jóváhagyott beiratkozással
  SELECT COUNT(*) INTO overlap_count
  FROM public.hunting_registrations
  WHERE security_zone_id = NEW.security_zone_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status = 'approved'
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    );
  
  -- Ha van átfedés, admin jóváhagyás szükséges
  IF overlap_count > 0 THEN
    NEW.requires_admin_approval := true;
    NEW.status := 'pending';
  ELSE
    -- Ha nincs átfedés és vadász, automatikus jóváhagyás
    IF has_role(NEW.user_id, 'hunter'::app_role) THEN
      NEW.status := 'approved';
      NEW.requires_admin_approval := false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger az átfedés ellenőrzésére
CREATE TRIGGER check_overlap_before_insert
BEFORE INSERT ON public.hunting_registrations
FOR EACH ROW
EXECUTE FUNCTION public.check_hunting_overlap();

CREATE TRIGGER check_overlap_before_update
BEFORE UPDATE ON public.hunting_registrations
FOR EACH ROW
WHEN (OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.end_time IS DISTINCT FROM NEW.end_time)
EXECUTE FUNCTION public.check_hunting_overlap();