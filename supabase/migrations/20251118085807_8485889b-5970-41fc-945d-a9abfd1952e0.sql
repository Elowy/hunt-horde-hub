-- Add membership discount setting to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS enable_membership_discount boolean DEFAULT false;

COMMENT ON COLUMN profiles.enable_membership_discount IS 'Engedélyezi-e a tagdíj alapú kedvezményt állatfoglaláskor';