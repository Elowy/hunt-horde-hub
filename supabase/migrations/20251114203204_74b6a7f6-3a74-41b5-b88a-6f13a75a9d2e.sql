-- Create profiles table for user accounts
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  company_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  primary key (id)
);

alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Users can view their own profile" 
on public.profiles 
for select 
using (auth.uid() = id);

create policy "Users can update their own profile" 
on public.profiles 
for update 
using (auth.uid() = id);

create policy "Users can insert their own profile" 
on public.profiles 
for insert 
with check (auth.uid() = id);

-- Create function to update timestamps
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create trigger for automatic timestamp updates
create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

-- Create function to handle new user registration
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, company_name, contact_name, contact_email, contact_phone, address)
  values (
    new.id,
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'contact_name',
    new.raw_user_meta_data ->> 'contact_email',
    new.raw_user_meta_data ->> 'contact_phone',
    new.raw_user_meta_data ->> 'address'
  );
  return new;
end;
$$;

-- Create trigger to automatically create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();