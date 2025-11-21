-- Add index for better balance query performance
CREATE INDEX IF NOT EXISTS idx_balances_user_society 
ON user_balances(user_id, hunter_society_id);