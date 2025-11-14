-- Frissítjük az animals tábla SELECT politikáját, hogy a vadászok (hunter) is láthassák az állatokat
DROP POLICY IF EXISTS "Users and editors can view animals" ON public.animals;
CREATE POLICY "Users, editors, and hunters can view animals"
ON public.animals
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'hunter'::app_role)
);

-- Frissítjük a storage_locations SELECT politikáját, hogy a vadászok is láthassák a hűtési helyeket
DROP POLICY IF EXISTS "Users can view their own storage locations" ON public.storage_locations;
CREATE POLICY "Users, hunters can view storage locations"
ON public.storage_locations
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'hunter'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Frissítjük a price_settings SELECT politikáját, hogy a vadászok is láthassák az árakat
DROP POLICY IF EXISTS "Users can view their own price settings" ON public.price_settings;
CREATE POLICY "Users, hunters can view price settings"
ON public.price_settings
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'hunter'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);