-- Create security definer function to get user's company name
create or replace function public.get_user_company_name(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select company_name
  from public.profiles
  where id = _user_id
  limit 1
$$;

-- Update storage_locations RLS policies
drop policy if exists "Users, hunters can view storage locations" on public.storage_locations;

create policy "Users can view storage locations from their company"
on public.storage_locations
for select
using (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'hunter'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(storage_locations.user_id)
    )
  )
);

-- Update animals RLS policies
drop policy if exists "Users, editors and admins can create animals" on public.animals;

create policy "Users can create animals for their company"
on public.animals
for insert
with check (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(user_id)
    )
  )
);

drop policy if exists "Only owners and admins can update animals" on public.animals;

create policy "Users can update animals from their company"
on public.animals
for update
using (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(animals.user_id)
    )
  )
);

drop policy if exists "Only owners and admins can delete animals" on public.animals;

create policy "Users can delete animals from their company"
on public.animals
for delete
using (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(animals.user_id)
    )
  )
);

-- Update price_settings RLS policies
drop policy if exists "Users, hunters can view price settings" on public.price_settings;

create policy "Users can view price settings from their company"
on public.price_settings
for select
using (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'hunter'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(price_settings.user_id)
    )
  )
);

-- Update transport_documents RLS policies
create policy "Users can view transport documents from their company"
on public.transport_documents
for select
using (
  auth.uid() = user_id 
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(transport_documents.user_id)
    )
  )
);

-- Update transporters RLS policies
create policy "Users can view transporters from their company"
on public.transporters
for select
using (
  auth.uid() = user_id 
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(transporters.user_id)
    )
  )
);