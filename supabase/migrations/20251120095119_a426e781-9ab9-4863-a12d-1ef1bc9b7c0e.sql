-- Allow anonymous users to read QR codes for guest registration and storage location submission
CREATE POLICY "Anyone can view active QR codes"
ON qr_codes FOR SELECT
USING (is_active = true);

-- Allow anonymous users to view storage locations when accessed via QR code
CREATE POLICY "Anyone can view storage locations via QR code"
ON storage_locations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.storage_location_id = storage_locations.id
    AND qr_codes.is_active = true
    AND qr_codes.type = 'storage_location'
  )
);