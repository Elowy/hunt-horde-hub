-- Allow anyone (including anonymous users) to view hunter society profiles for registration
CREATE POLICY "Anyone can view hunter society basic info"
ON public.profiles
FOR SELECT
USING (user_type = 'hunter_society');