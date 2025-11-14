-- Add is_default column to storage_locations table
alter table public.storage_locations
add column is_default boolean default false;

-- Create function to ensure only one default location per user
create or replace function public.ensure_single_default_location()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_default = true then
    -- Set all other locations for this user to false
    update public.storage_locations
    set is_default = false
    where user_id = new.user_id and id != new.id;
  end if;
  return new;
end;
$$;

-- Create trigger to enforce single default location
create trigger ensure_single_default_location_trigger
before insert or update on public.storage_locations
for each row
execute function public.ensure_single_default_location();