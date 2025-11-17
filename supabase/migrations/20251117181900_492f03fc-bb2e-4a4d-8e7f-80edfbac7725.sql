-- Drop the old constraint that only allows hunter_society and buyer
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- Add new constraint that allows hunter_society, buyer, and hunter
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type = ANY (ARRAY['hunter_society'::text, 'buyer'::text, 'hunter'::text]));