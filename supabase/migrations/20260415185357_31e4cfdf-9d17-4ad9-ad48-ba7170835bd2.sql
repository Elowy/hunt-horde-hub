
-- Create trigger function for membership payment balance updates
CREATE OR REPLACE FUNCTION public.handle_membership_payment_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_bal NUMERIC;
  new_bal NUMERIC;
BEGIN
  -- Only when paid changes to true
  IF NEW.paid = TRUE AND (OLD.paid = FALSE OR OLD.paid IS NULL) THEN
    
    -- Get or create balance
    SELECT current_balance INTO current_bal
    FROM user_balances
    WHERE user_id = NEW.hunter_society_id AND hunter_society_id = NEW.hunter_society_id;
    
    IF current_bal IS NULL THEN
      current_bal := 0;
      INSERT INTO user_balances (user_id, hunter_society_id, current_balance, last_transaction_at)
      VALUES (NEW.hunter_society_id, NEW.hunter_society_id, NEW.amount, COALESCE(NEW.paid_at, NOW()));
      new_bal := NEW.amount;
    ELSE
      new_bal := current_bal + NEW.amount;
      UPDATE user_balances
      SET current_balance = new_bal,
          last_transaction_at = COALESCE(NEW.paid_at, NOW()),
          updated_at = NOW()
      WHERE user_id = NEW.hunter_society_id AND hunter_society_id = NEW.hunter_society_id;
    END IF;
    
    -- Insert transaction record
    INSERT INTO user_balance_transactions (
      user_id,
      hunter_society_id,
      transaction_type,
      amount,
      balance_after,
      status,
      notes,
      related_payment_id,
      created_at
    ) VALUES (
      NEW.hunter_society_id,
      NEW.hunter_society_id,
      'membership_fee',
      NEW.amount,
      new_bal,
      'approved',
      'Tagdíj befizetés: ' || NEW.season_year || ' - ' || NEW.period || ' (' || 
        (SELECT COALESCE(contact_name, company_name, 'Ismeretlen') FROM profiles WHERE id = NEW.user_id) || ')',
      NEW.id,
      COALESCE(NEW.paid_at, NOW())
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER membership_payment_balance_trigger
AFTER UPDATE ON public.membership_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_membership_payment_balance();

-- Also handle INSERT with paid = true
CREATE TRIGGER membership_payment_balance_insert_trigger
AFTER INSERT ON public.membership_payments
FOR EACH ROW
WHEN (NEW.paid = TRUE)
EXECUTE FUNCTION public.handle_membership_payment_balance();

-- Fix: the INSERT trigger needs a different function since OLD doesn't exist
CREATE OR REPLACE FUNCTION public.handle_membership_payment_balance_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_bal NUMERIC;
  new_bal NUMERIC;
BEGIN
  IF NEW.paid = TRUE THEN
    SELECT current_balance INTO current_bal
    FROM user_balances
    WHERE user_id = NEW.hunter_society_id AND hunter_society_id = NEW.hunter_society_id;
    
    IF current_bal IS NULL THEN
      current_bal := 0;
      INSERT INTO user_balances (user_id, hunter_society_id, current_balance, last_transaction_at)
      VALUES (NEW.hunter_society_id, NEW.hunter_society_id, NEW.amount, COALESCE(NEW.paid_at, NOW()));
      new_bal := NEW.amount;
    ELSE
      new_bal := current_bal + NEW.amount;
      UPDATE user_balances
      SET current_balance = new_bal,
          last_transaction_at = COALESCE(NEW.paid_at, NOW()),
          updated_at = NOW()
      WHERE user_id = NEW.hunter_society_id AND hunter_society_id = NEW.hunter_society_id;
    END IF;
    
    INSERT INTO user_balance_transactions (
      user_id,
      hunter_society_id,
      transaction_type,
      amount,
      balance_after,
      status,
      notes,
      related_payment_id,
      created_at
    ) VALUES (
      NEW.hunter_society_id,
      NEW.hunter_society_id,
      'membership_fee',
      NEW.amount,
      new_bal,
      'approved',
      'Tagdíj befizetés: ' || NEW.season_year || ' - ' || NEW.period || ' (' || 
        (SELECT COALESCE(contact_name, company_name, 'Ismeretlen') FROM profiles WHERE id = NEW.user_id) || ')',
      NEW.id,
      COALESCE(NEW.paid_at, NOW())
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate the insert trigger with the correct function
DROP TRIGGER IF EXISTS membership_payment_balance_insert_trigger ON public.membership_payments;
CREATE TRIGGER membership_payment_balance_insert_trigger
AFTER INSERT ON public.membership_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_membership_payment_balance_insert();

-- Backfill: Process existing paid membership payments
DO $$
DECLARE
  rec RECORD;
  current_bal NUMERIC;
  new_bal NUMERIC;
BEGIN
  FOR rec IN 
    SELECT mp.*, p.contact_name, p.company_name
    FROM membership_payments mp
    LEFT JOIN profiles p ON p.id = mp.user_id
    WHERE mp.paid = TRUE
    ORDER BY mp.paid_at NULLS LAST, mp.created_at
  LOOP
    -- Check if already processed (avoid duplicates)
    IF NOT EXISTS (
      SELECT 1 FROM user_balance_transactions 
      WHERE related_payment_id = rec.id 
      AND transaction_type = 'membership_fee'
    ) THEN
      -- Get current balance for the society
      SELECT current_balance INTO current_bal
      FROM user_balances
      WHERE user_id = rec.hunter_society_id AND hunter_society_id = rec.hunter_society_id;
      
      IF current_bal IS NULL THEN
        current_bal := 0;
        INSERT INTO user_balances (user_id, hunter_society_id, current_balance, last_transaction_at)
        VALUES (rec.hunter_society_id, rec.hunter_society_id, rec.amount, COALESCE(rec.paid_at, rec.created_at));
        new_bal := rec.amount;
      ELSE
        new_bal := current_bal + rec.amount;
        UPDATE user_balances
        SET current_balance = new_bal,
            last_transaction_at = COALESCE(rec.paid_at, rec.created_at),
            updated_at = NOW()
        WHERE user_id = rec.hunter_society_id AND hunter_society_id = rec.hunter_society_id;
      END IF;
      
      INSERT INTO user_balance_transactions (
        user_id,
        hunter_society_id,
        transaction_type,
        amount,
        balance_after,
        status,
        notes,
        related_payment_id,
        created_at
      ) VALUES (
        rec.hunter_society_id,
        rec.hunter_society_id,
        'membership_fee',
        rec.amount,
        new_bal,
        'approved',
        'Tagdíj befizetés: ' || rec.season_year || ' - ' || rec.period || ' (' || 
          COALESCE(rec.contact_name, rec.company_name, 'Ismeretlen') || ')',
        rec.id,
        COALESCE(rec.paid_at, rec.created_at)
      );
    END IF;
  END LOOP;
END;
$$;
