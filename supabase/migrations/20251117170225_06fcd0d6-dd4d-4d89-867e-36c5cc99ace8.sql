-- Update cooling_prices RLS policies
drop policy if exists "Users can view their own cooling prices" on public.cooling_prices;

create policy "Users can view cooling prices from their company"
on public.cooling_prices
for select
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(cooling_prices.user_id)
    )
  )
);

drop policy if exists "Users can create their own cooling prices" on public.cooling_prices;

create policy "Users can create cooling prices for their company"
on public.cooling_prices
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

drop policy if exists "Users can update their own cooling prices" on public.cooling_prices;

create policy "Users can update cooling prices from their company"
on public.cooling_prices
for update
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(cooling_prices.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

drop policy if exists "Users can delete their own cooling prices" on public.cooling_prices;

create policy "Users can delete cooling prices from their company"
on public.cooling_prices
for delete
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(cooling_prices.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

-- Update price_settings insert/update/delete policies
drop policy if exists "Users can create their own price settings" on public.price_settings;

create policy "Users can create price settings for their company"
on public.price_settings
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

drop policy if exists "Users can update their own price settings" on public.price_settings;

create policy "Users can update price settings from their company"
on public.price_settings
for update
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(price_settings.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

drop policy if exists "Users can delete their own price settings" on public.price_settings;

create policy "Users can delete price settings from their company"
on public.price_settings
for delete
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(price_settings.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

-- Update transport_documents insert/update/delete policies
create policy "Users can create transport documents for their company"
on public.transport_documents
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

create policy "Users can update transport documents from their company"
on public.transport_documents
for update
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(transport_documents.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

create policy "Users can delete transport documents from their company"
on public.transport_documents
for delete
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(transport_documents.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

-- Update transporters insert/update/delete policies
create policy "Users can create transporters for their company"
on public.transporters
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

create policy "Users can update transporters from their company"
on public.transporters
for update
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(transporters.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);

create policy "Users can delete transporters from their company"
on public.transporters
for delete
using (
  auth.uid() = user_id
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND company_name = get_user_company_name(transporters.user_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    )
  )
);