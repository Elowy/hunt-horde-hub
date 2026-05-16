
INSERT INTO storage.buckets (id, name, public)
VALUES ('cash-reports', 'cash-reports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Society reads own cash reports" ON storage.objects;
CREATE POLICY "Society reads own cash reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cash-reports'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR has_role(auth.uid(),'super_admin'::app_role))
  );

DROP POLICY IF EXISTS "Society writes own cash reports" ON storage.objects;
CREATE POLICY "Society writes own cash reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cash-reports'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR has_role(auth.uid(),'super_admin'::app_role))
  );

DROP POLICY IF EXISTS "Society updates own cash reports" ON storage.objects;
CREATE POLICY "Society updates own cash reports"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cash-reports'
    AND ((storage.foldername(name))[1] = auth.uid()::text
         OR has_role(auth.uid(),'super_admin'::app_role))
  );
