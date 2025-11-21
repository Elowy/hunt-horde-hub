-- Add web notification columns for hunter-relevant notifications
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS web_notify_on_registration_approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS web_notify_on_registration_rejected BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.notification_settings.web_notify_on_registration_approved IS 'Webes értesítés beiratkozás jóváhagyásakor';
COMMENT ON COLUMN public.notification_settings.web_notify_on_registration_rejected IS 'Webes értesítés beiratkozás elutasításakor';

-- Remove cooled animals and reservation permissions from hunter_feature_permissions
ALTER TABLE public.hunter_feature_permissions
DROP COLUMN IF EXISTS allow_view_cooled_animals,
DROP COLUMN IF EXISTS allow_reserve_animals;

COMMENT ON TABLE public.hunter_feature_permissions IS 'Vadász jogosultságok: beiratkozások, statisztikák, hírek';