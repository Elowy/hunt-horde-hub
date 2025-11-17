-- Create a security definer function to handle trial subscription creation
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create trial for hunter_society user types
  IF (NEW.raw_user_meta_data->>'user_type') = 'hunter_society' THEN
    INSERT INTO public.trial_subscriptions (
      user_id,
      tier,
      started_at,
      expires_at,
      newsletter_subscribed
    )
    VALUES (
      NEW.id,
      'pro',
      NOW(),
      NOW() + INTERVAL '30 days',
      COALESCE((NEW.raw_user_meta_data->>'newsletter_subscribed')::boolean, false)
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to automatically create trial subscriptions
DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- Drop any existing permissive INSERT policies on trial_subscriptions
DROP POLICY IF EXISTS "Users can insert their own trial subscription" ON public.trial_subscriptions;

-- Add strict RLS policy that blocks all direct client inserts
CREATE POLICY "Only system can insert trials"
ON public.trial_subscriptions
FOR INSERT
WITH CHECK (false);