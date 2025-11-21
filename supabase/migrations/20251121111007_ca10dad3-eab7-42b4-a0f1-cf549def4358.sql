-- Add notification setting for new hunter registrations
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS notify_on_new_hunter_registration BOOLEAN DEFAULT true;

-- Add comment
COMMENT ON COLUMN notification_settings.notify_on_new_hunter_registration IS 'Notify admin when a new hunter registers and needs approval';