-- Create user_balance_transactions table
CREATE TABLE user_balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hunter_society_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction type
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'deposit',              -- Befizetés
    'membership_fee',       -- Tagdíj levonás
    'animal_reservation',   -- Állatfoglalás levonás
    'animal_purchase',      -- Állatvásárlás levonás
    'refund',              -- Visszatérítés
    'admin_adjustment'      -- Admin kézi korrekció
  )),
  
  -- Amount (positive = deposit, negative = deduction)
  amount NUMERIC NOT NULL,
  
  -- Balance after transaction
  balance_after NUMERIC NOT NULL DEFAULT 0,
  
  -- Deposit specific fields
  reference_number TEXT,
  payment_proof_url TEXT,
  
  -- Admin approval
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Related entities
  related_payment_id UUID REFERENCES membership_payments(id) ON DELETE SET NULL,
  related_animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_balances table (cache for fast queries)
CREATE TABLE user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hunter_society_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Current balance
  current_balance NUMERIC NOT NULL DEFAULT 0,
  
  -- Last transaction timestamp
  last_transaction_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, hunter_society_id)
);

-- Indexes for user_balance_transactions
CREATE INDEX idx_balance_transactions_user ON user_balance_transactions(user_id);
CREATE INDEX idx_balance_transactions_society ON user_balance_transactions(hunter_society_id);
CREATE INDEX idx_balance_transactions_status ON user_balance_transactions(status);
CREATE INDEX idx_balance_transactions_type ON user_balance_transactions(transaction_type);

-- Indexes for user_balances
CREATE INDEX idx_balances_user ON user_balances(user_id);
CREATE INDEX idx_balances_society ON user_balances(hunter_society_id);

-- Enable RLS
ALTER TABLE user_balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_balance_transactions
CREATE POLICY "Users can view their own transactions"
  ON user_balance_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposit transactions"
  ON user_balance_transactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND transaction_type = 'deposit' 
    AND status = 'pending'
  );

CREATE POLICY "Admins can view all transactions in their society"
  ON user_balance_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
    AND hunter_society_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update transactions in their society"
  ON user_balance_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
    AND hunter_society_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Super admins can do everything on transactions"
  ON user_balance_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- RLS Policies for user_balances
CREATE POLICY "Users can view their own balance"
  ON user_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view balances in their society"
  ON user_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
    AND hunter_society_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all balances"
  ON user_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- Trigger function to update user balance
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_bal NUMERIC;
BEGIN
  -- Only for approved transactions
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Get current balance
    SELECT current_balance INTO current_bal
    FROM user_balances
    WHERE user_id = NEW.user_id AND hunter_society_id = NEW.hunter_society_id;
    
    -- If no balance record exists, create it
    IF current_bal IS NULL THEN
      INSERT INTO user_balances (user_id, hunter_society_id, current_balance, last_transaction_at)
      VALUES (NEW.user_id, NEW.hunter_society_id, NEW.amount, COALESCE(NEW.approved_at, NOW()))
      RETURNING current_balance INTO current_bal;
      
      NEW.balance_after := current_bal;
    ELSE
      -- Update balance
      UPDATE user_balances
      SET 
        current_balance = current_balance + NEW.amount,
        last_transaction_at = COALESCE(NEW.approved_at, NOW()),
        updated_at = NOW()
      WHERE user_id = NEW.user_id AND hunter_society_id = NEW.hunter_society_id
      RETURNING current_balance INTO current_bal;
      
      NEW.balance_after := current_bal;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_update_balance
  BEFORE UPDATE ON user_balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();

-- Create trigger for updated_at on user_balance_transactions
CREATE TRIGGER update_balance_transactions_updated_at
  BEFORE UPDATE ON user_balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();