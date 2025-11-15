-- Drop the existing policy that allows users to update their own tickets
DROP POLICY IF EXISTS "Users can update their own open tickets" ON public.tickets;

-- Create a new policy that allows users to update their own open tickets
CREATE POLICY "Users can update their own open tickets"
ON public.tickets
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND status = 'open'::ticket_status
)
WITH CHECK (
  auth.uid() = user_id
);

-- Create a function to check if user can update ticket status
CREATE OR REPLACE FUNCTION public.check_ticket_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status is being changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if user is super admin
    IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Csak super adminok módosíthatják a ticket státuszát';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce status update restriction
DROP TRIGGER IF EXISTS enforce_ticket_status_update ON public.tickets;
CREATE TRIGGER enforce_ticket_status_update
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.check_ticket_status_update();