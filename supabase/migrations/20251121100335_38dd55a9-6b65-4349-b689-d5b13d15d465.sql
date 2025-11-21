-- Fix function search path security issue
-- Drop trigger first, then function, then recreate both

DROP TRIGGER IF EXISTS trigger_update_balance ON user_balance_transactions;
DROP FUNCTION IF EXISTS update_user_balance();

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER trigger_update_balance
  BEFORE UPDATE ON user_balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();