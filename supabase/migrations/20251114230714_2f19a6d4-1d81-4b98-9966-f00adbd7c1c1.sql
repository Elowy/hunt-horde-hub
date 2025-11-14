-- Adjuk hozzá az új mezőket a profiles táblához a vadász regisztrációhoz
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hunter_license_number TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE;