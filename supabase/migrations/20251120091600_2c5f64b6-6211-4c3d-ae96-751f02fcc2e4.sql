-- Create enum for announcement types
CREATE TYPE public.announcement_type AS ENUM ('news', 'maintenance', 'outage');

-- Create enum for maintenance status
CREATE TYPE public.maintenance_status AS ENUM ('unknown', 'investigating', 'fixing', 'fixed', 'testing');

-- Add new columns to announcements table
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS announcement_type public.announcement_type DEFAULT 'news',
ADD COLUMN IF NOT EXISTS maintenance_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS maintenance_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS maintenance_status public.maintenance_status DEFAULT 'unknown';