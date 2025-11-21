-- Allow admins and editors to view hunters in their society
CREATE POLICY "Admins and editors can view hunters in their society"
  ON profiles FOR SELECT
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    AND user_type = 'hunter'
    AND hunter_society_id = auth.uid()
  );