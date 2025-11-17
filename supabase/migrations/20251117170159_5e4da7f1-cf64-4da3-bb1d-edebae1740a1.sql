-- Update security_zones RLS policies
drop policy if exists "Users and hunters can view zones" on public.security_zones;

create policy "Users can view security zones from their company"
on public.security_zones
for select
using (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'hunter'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(security_zones.user_id)
    )
  )
);

drop policy if exists "Users can create their own zones" on public.security_zones;

create policy "Users can create security zones for their company"
on public.security_zones
for insert
with check (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

drop policy if exists "Users can update their own zones" on public.security_zones;

create policy "Users can update security zones from their company"
on public.security_zones
for update
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(security_zones.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

drop policy if exists "Users can delete their own zones" on public.security_zones;

create policy "Users can delete security zones from their company"
on public.security_zones
for delete
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(security_zones.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

-- Update settlements RLS policies
drop policy if exists "Users and hunters can view settlements" on public.settlements;

create policy "Users can view settlements from their company"
on public.settlements
for select
using (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'hunter'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(settlements.user_id)
    )
  )
);

drop policy if exists "Users can create their own settlements" on public.settlements;

create policy "Users can create settlements for their company"
on public.settlements
for insert
with check (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

drop policy if exists "Users can update their own settlements" on public.settlements;

create policy "Users can update settlements from their company"
on public.settlements
for update
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(settlements.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

drop policy if exists "Users can delete their own settlements" on public.settlements;

create policy "Users can delete settlements from their company"
on public.settlements
for delete
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(settlements.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

-- Update hunting_locations RLS policies
drop policy if exists "Users can view their own locations" on public.hunting_locations;

create policy "Users can view hunting locations from their company"
on public.hunting_locations
for select
using (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'hunter'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(hunting_locations.user_id)
    )
  )
);

-- Update storage_locations insert/update/delete policies
drop policy if exists "Users can create their own storage locations" on public.storage_locations;

create policy "Users can create storage locations for their company"
on public.storage_locations
for insert
with check (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

drop policy if exists "Users can update their own storage locations" on public.storage_locations;

create policy "Users can update storage locations from their company"
on public.storage_locations
for update
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(storage_locations.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

drop policy if exists "Users can delete their own storage locations" on public.storage_locations;

create policy "Users can delete storage locations from their company"
on public.storage_locations
for delete
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(storage_locations.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);