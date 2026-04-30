-- 1) profiles: drop overly broad SELECT policies for anon and authenticated
DROP POLICY IF EXISTS "Anon can read hunter society id and name via view" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view hunter society basic info" ON public.profiles;

-- 2) subscription_codes: drop policy that exposes all unredeemed codes
DROP POLICY IF EXISTS "Users can view unredeemed codes" ON public.subscription_codes;
DROP POLICY IF EXISTS "Users can redeem codes" ON public.subscription_codes;

-- Secure redeem function: validates code, marks redeemed, returns tier/duration only.
CREATE OR REPLACE FUNCTION public.redeem_subscription_code(_code text)
RETURNS TABLE (tier text, duration text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _row public.subscription_codes%ROWTYPE;
  _sub_end timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Bejelentkezés szükséges';
  END IF;

  SELECT * INTO _row
  FROM public.subscription_codes
  WHERE code = upper(trim(_code))
    AND redeemed_by IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Érvénytelen vagy már beváltott kód';
  END IF;

  UPDATE public.subscription_codes
  SET redeemed_by = _user_id, redeemed_at = now()
  WHERE id = _row.id;

  IF _row.duration = 'monthly' THEN
    _sub_end := now() + interval '1 month';
  ELSE
    _sub_end := now() + interval '1 year';
  END IF;

  INSERT INTO public.trial_subscriptions (user_id, tier, expires_at, newsletter_subscribed)
  VALUES (_user_id, _row.tier, _sub_end, false)
  ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier,
        expires_at = EXCLUDED.expires_at;

  RETURN QUERY SELECT _row.tier, _row.duration;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_subscription_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_subscription_code(text) TO authenticated;