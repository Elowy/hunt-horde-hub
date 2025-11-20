-- Create enum for epidemic severity levels
CREATE TYPE public.epidemic_severity AS ENUM (
  'kozepes',
  'magas',
  'fertozott',
  'szigoruan_korlatozott'
);

-- Create epidemic_measures table
CREATE TABLE public.epidemic_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  severity public.epidemic_severity NOT NULL,
  affected_species TEXT[] NOT NULL DEFAULT '{}',
  shooting_fee NUMERIC NOT NULL DEFAULT 0,
  sampling_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.epidemic_measures ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own epidemic measures"
  ON public.epidemic_measures
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create epidemic measures"
  ON public.epidemic_measures
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Admins can update their own epidemic measures"
  ON public.epidemic_measures
  FOR UPDATE
  USING (
    auth.uid() = user_id AND 
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Admins can delete their own epidemic measures"
  ON public.epidemic_measures
  FOR DELETE
  USING (
    auth.uid() = user_id AND 
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  );

-- Create trigger for updated_at
CREATE TRIGGER update_epidemic_measures_updated_at
  BEFORE UPDATE ON public.epidemic_measures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity log trigger
CREATE OR REPLACE FUNCTION public.log_epidemic_measure_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

  INSERT INTO public.activity_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    user_email,
    action_type,
    'epidemic_measure',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'name', COALESCE(NEW.name, OLD.name),
      'severity', COALESCE(NEW.severity, OLD.severity),
      'is_active', COALESCE(NEW.is_active, OLD.is_active)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_epidemic_measure_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.epidemic_measures
  FOR EACH ROW
  EXECUTE FUNCTION public.log_epidemic_measure_activity();