-- Modify maintenance_status enum to use new values
ALTER TYPE maintenance_status RENAME TO maintenance_status_old;

CREATE TYPE maintenance_status AS ENUM ('bejelentett', 'folyamatban', 'varatlan_hiba', 'befejezett');

-- Update announcements table with new enum type and convert existing data
ALTER TABLE announcements 
  ALTER COLUMN maintenance_status DROP DEFAULT,
  ALTER COLUMN maintenance_status TYPE maintenance_status 
    USING CASE 
      WHEN maintenance_status::text = 'bejelentve' THEN 'bejelentett'::maintenance_status
      WHEN maintenance_status::text = 'folyamatban' THEN 'folyamatban'::maintenance_status
      WHEN maintenance_status::text = 'elvegezve' THEN 'befejezett'::maintenance_status
      ELSE 'bejelentett'::maintenance_status
    END,
  ALTER COLUMN maintenance_status SET DEFAULT 'bejelentett'::maintenance_status;

-- Drop old enum type
DROP TYPE maintenance_status_old;