-- Update the status check constraint to include 'cancelled' status
ALTER TABLE public.hunting_registrations 
DROP CONSTRAINT hunting_registrations_status_check;

ALTER TABLE public.hunting_registrations 
ADD CONSTRAINT hunting_registrations_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Add comment
COMMENT ON CONSTRAINT hunting_registrations_status_check ON public.hunting_registrations 
IS 'Allowed statuses: pending (waiting for approval), approved (confirmed), rejected (denied), cancelled (user cancelled their own registration)';
