-- Add guest registration fields to hunting_registrations table
ALTER TABLE public.hunting_registrations
ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_name text,
ADD COLUMN IF NOT EXISTS guest_address text,
ADD COLUMN IF NOT EXISTS guest_license_number text,
ADD COLUMN IF NOT EXISTS guest_phone text,
ADD COLUMN IF NOT EXISTS guest_email text;

-- Update RLS policy to allow guest registrations (insert only)
CREATE POLICY "Guests can create registrations with approval required"
ON public.hunting_registrations
FOR INSERT
TO anon
WITH CHECK (
  is_guest = true 
  AND requires_admin_approval = true 
  AND status = 'pending'
);

-- Allow anonymous users to read security zones for the guest registration form
CREATE POLICY "Anonymous users can view security zones for registration"
ON public.security_zones
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read hunting locations for the guest registration form
CREATE POLICY "Anonymous users can view hunting locations for registration"
ON public.hunting_locations
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read security zone closures for the guest registration form
CREATE POLICY "Anonymous users can view security zone closures"
ON public.security_zone_closures
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read settlements for the guest registration form
CREATE POLICY "Anonymous users can view settlements"
ON public.settlements
FOR SELECT
TO anon
USING (true);