-- Create storage bucket for transport companion tickets (vadkísérő jegyek)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transport-tickets',
  'transport-tickets',
  false,
  5242880, -- 5MB limit per file
  ARRAY['application/pdf']
);

-- RLS policies for transport-tickets bucket
CREATE POLICY "Users can upload their own transport tickets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transport-tickets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own transport tickets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'transport-tickets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own transport tickets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'transport-tickets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins and editors can view all transport tickets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'transport-tickets'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  )
);