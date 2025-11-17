-- Add new notification settings for registration approval/rejection
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS notify_on_registration_approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_registration_rejected BOOLEAN DEFAULT true;