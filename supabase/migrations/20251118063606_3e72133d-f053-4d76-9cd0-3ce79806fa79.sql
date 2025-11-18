-- Ensure notification_settings has a unique constraint on user_id
-- This is needed for upsert to work correctly
ALTER TABLE public.notification_settings 
DROP CONSTRAINT IF EXISTS notification_settings_user_id_key;

ALTER TABLE public.notification_settings 
ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);