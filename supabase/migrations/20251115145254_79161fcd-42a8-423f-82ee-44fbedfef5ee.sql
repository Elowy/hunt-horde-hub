-- Add expires_at column to announcements table
ALTER TABLE public.announcements 
ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient querying of active announcements
CREATE INDEX idx_announcements_expires_at ON public.announcements(expires_at);

-- Add archived column to track manually archived announcements
ALTER TABLE public.announcements 
ADD COLUMN is_archived boolean DEFAULT false;

-- Add index for archived status
CREATE INDEX idx_announcements_archived ON public.announcements(is_archived);