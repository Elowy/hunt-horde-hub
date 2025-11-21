-- Populate hunter_society_id for hunters who are members but don't have it set
UPDATE profiles
SET hunter_society_id = hsm.hunter_society_id
FROM hunter_society_members hsm
WHERE profiles.id = hsm.hunter_id
  AND profiles.user_type = 'hunter'
  AND profiles.hunter_society_id IS NULL;

-- Create index for faster queries on hunter_society_id
CREATE INDEX IF NOT EXISTS idx_profiles_hunter_society_id ON profiles(hunter_society_id) WHERE hunter_society_id IS NOT NULL;