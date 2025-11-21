-- Extend hired_hunters table with new fields
ALTER TABLE hired_hunters 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hired_hunters_token ON hired_hunters(invitation_token);
CREATE INDEX IF NOT EXISTS idx_hired_hunters_expires ON hired_hunters(expires_at);

-- Create hired_hunter_revenues table
CREATE TABLE IF NOT EXISTS hired_hunter_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hired_hunter_id UUID NOT NULL REFERENCES hired_hunters(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL
);

-- Enable RLS on hired_hunter_revenues
ALTER TABLE hired_hunter_revenues ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can manage revenues for their hired hunters
CREATE POLICY "Users can manage revenues for their hired hunters"
  ON hired_hunter_revenues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hired_hunters
      WHERE hired_hunters.id = hired_hunter_revenues.hired_hunter_id
      AND hired_hunters.user_id = auth.uid()
    )
  );

-- Trigger for updating updated_at on hired_hunter_revenues
CREATE TRIGGER update_hired_hunter_revenues_updated_at
  BEFORE UPDATE ON hired_hunter_revenues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();