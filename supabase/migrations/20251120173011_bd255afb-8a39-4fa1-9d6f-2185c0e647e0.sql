-- Remove CASCADE from profiles hunter_society_id foreign key
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_hunter_society_id_fkey;

-- Re-add the foreign key WITHOUT cascade
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_hunter_society_id_fkey 
FOREIGN KEY (hunter_society_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Do the same for hunter_society_members table
ALTER TABLE public.hunter_society_members
DROP CONSTRAINT IF EXISTS hunter_society_members_hunter_society_id_fkey;

ALTER TABLE public.hunter_society_members
ADD CONSTRAINT hunter_society_members_hunter_society_id_fkey
FOREIGN KEY (hunter_society_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- membership_fee_settings
ALTER TABLE public.membership_fee_settings
DROP CONSTRAINT IF EXISTS membership_fee_settings_hunter_society_id_fkey;

ALTER TABLE public.membership_fee_settings
ADD CONSTRAINT membership_fee_settings_hunter_society_id_fkey
FOREIGN KEY (hunter_society_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- membership_payments
ALTER TABLE public.membership_payments
DROP CONSTRAINT IF EXISTS membership_payments_hunter_society_id_fkey;

ALTER TABLE public.membership_payments
ADD CONSTRAINT membership_payments_hunter_society_id_fkey
FOREIGN KEY (hunter_society_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;