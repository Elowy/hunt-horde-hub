-- Create security definer function to get user's hunter society ID
create or replace function public.get_user_hunter_society_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hunter_society_id
  from public.profiles
  where id = _user_id
  limit 1
$$;

-- Drop the problematic policy
drop policy if exists "Hunters can view their society's basic info" on public.profiles;

-- Recreate the policy using the security definer function
create policy "Hunters can view their society's basic info"
on public.profiles
for select
using (id = public.get_user_hunter_society_id(auth.uid()));