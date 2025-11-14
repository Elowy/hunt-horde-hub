-- Create storage_locations table for different cooling sites
create table public.storage_locations (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  address text,
  capacity integer,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.storage_locations enable row level security;

-- RLS policies for storage_locations
create policy "Users can view their own storage locations"
on public.storage_locations
for select
using (auth.uid() = user_id);

create policy "Users can create their own storage locations"
on public.storage_locations
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own storage locations"
on public.storage_locations
for update
using (auth.uid() = user_id);

create policy "Users can delete their own storage locations"
on public.storage_locations
for delete
using (auth.uid() = user_id);

-- Create animals table
create table public.animals (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  storage_location_id uuid not null references public.storage_locations on delete cascade,
  animal_id text not null,
  species text not null,
  gender text,
  weight numeric,
  age text,
  condition text,
  class text,
  hunter_type text,
  hunter_name text,
  cooling_date timestamp with time zone,
  expiry_date timestamp with time zone,
  sample_id text,
  sample_date timestamp with time zone,
  vet_check boolean default false,
  vet_notes text,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.animals enable row level security;

-- RLS policies for animals
create policy "Users can view their own animals"
on public.animals
for select
using (auth.uid() = user_id);

create policy "Users can create their own animals"
on public.animals
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own animals"
on public.animals
for update
using (auth.uid() = user_id);

create policy "Users can delete their own animals"
on public.animals
for delete
using (auth.uid() = user_id);

-- Trigger for storage_locations updated_at
create trigger update_storage_locations_updated_at
before update on public.storage_locations
for each row
execute function public.handle_updated_at();

-- Trigger for animals updated_at
create trigger update_animals_updated_at
before update on public.animals
for each row
execute function public.handle_updated_at();