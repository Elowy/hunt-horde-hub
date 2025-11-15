-- Fix function search path security warning by recreating the function with search_path
CREATE OR REPLACE FUNCTION public.update_quick_actions_settings_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;