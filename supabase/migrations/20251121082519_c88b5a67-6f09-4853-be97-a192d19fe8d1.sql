-- Drop the old enum type and create new one with updated values
ALTER TYPE maintenance_status RENAME TO maintenance_status_old;

CREATE TYPE maintenance_status AS ENUM ('bejelentve', 'folyamatban', 'elvegezve');

-- Update the announcements table to use the new enum
ALTER TABLE announcements 
  ALTER COLUMN maintenance_status DROP DEFAULT,
  ALTER COLUMN maintenance_status TYPE maintenance_status 
    USING CASE 
      WHEN maintenance_status::text = 'unknown' THEN 'bejelentve'::maintenance_status
      WHEN maintenance_status::text = 'investigating' THEN 'bejelentve'::maintenance_status
      WHEN maintenance_status::text = 'fixing' THEN 'folyamatban'::maintenance_status
      WHEN maintenance_status::text = 'testing' THEN 'folyamatban'::maintenance_status
      WHEN maintenance_status::text = 'fixed' THEN 'elvegezve'::maintenance_status
      ELSE 'bejelentve'::maintenance_status
    END,
  ALTER COLUMN maintenance_status SET DEFAULT 'bejelentve'::maintenance_status;

-- Drop the old enum type
DROP TYPE maintenance_status_old;