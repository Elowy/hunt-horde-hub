-- Frissítjük a security_zones és settlements RLS policy-kat
-- hogy a vadászok is láthassák őket, de ne módosíthassák

-- Settlements: Vadászok is láthatják
DROP POLICY IF EXISTS "Users can view their own settlements" ON public.settlements;
CREATE POLICY "Users and hunters can view settlements"
ON public.settlements
FOR SELECT
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hunter'::app_role));

-- Security zones: Vadászok is láthatják
DROP POLICY IF EXISTS "Users can view their own zones" ON public.security_zones;
CREATE POLICY "Users and hunters can view zones"
ON public.security_zones
FOR SELECT
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hunter'::app_role));