-- Add unique constraint for active hunting registrations
-- A user can only have one active registration at a time (pending or approved status)

CREATE UNIQUE INDEX unique_active_registration 
ON public.hunting_registrations (user_id) 
WHERE status IN ('pending', 'approved');

-- Add comment for documentation
COMMENT ON INDEX unique_active_registration IS 'Ensures a user can only have one active (pending or approved) hunting registration at a time';
