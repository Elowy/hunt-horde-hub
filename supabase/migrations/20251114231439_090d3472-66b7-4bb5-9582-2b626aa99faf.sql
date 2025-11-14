-- Létrehozunk egy táblát a próbaidőszakos előfizetésekhez
CREATE TABLE IF NOT EXISTS public.trial_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'pro',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  newsletter_subscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS bekapcsolása
ALTER TABLE public.trial_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy hogy a felhasználók lássák a sajátjukat
CREATE POLICY "Users can view their own trial subscription"
ON public.trial_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy hogy az adminok mindent lássanak
CREATE POLICY "Admins can view all trial subscriptions"
ON public.trial_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));