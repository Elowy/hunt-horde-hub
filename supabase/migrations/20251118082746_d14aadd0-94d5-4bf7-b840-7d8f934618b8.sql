-- Create storage bucket for hunter society documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  2621440, -- 2.5 MB in bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
);

-- RLS Policy: Only hunter societies can upload documents
CREATE POLICY "Hunter societies can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'hunter_society'
);

-- RLS Policy: Only hunter societies can view their own documents
CREATE POLICY "Hunter societies can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Only hunter societies can update their own documents
CREATE POLICY "Hunter societies can update own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Only hunter societies can delete their own documents
CREATE POLICY "Hunter societies can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);