-- Add membership fee notification setting
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS notify_on_membership_fee boolean DEFAULT true;