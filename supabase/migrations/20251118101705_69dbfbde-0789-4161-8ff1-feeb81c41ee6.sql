-- Add notification setting for ticket status changes
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS notify_on_ticket_status_change boolean DEFAULT true;