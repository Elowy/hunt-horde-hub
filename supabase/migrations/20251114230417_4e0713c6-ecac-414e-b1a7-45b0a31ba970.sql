-- Létrehozunk egy táblát az örökös előfizetéseknek
CREATE TABLE public.lifetime_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- RLS bekapcsolása
ALTER TABLE public.lifetime_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy hogy az adminok mindent lássanak
CREATE POLICY "Admins can view all lifetime subscriptions"
ON public.lifetime_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy hogy a felhasználók lássák a sajátjukat
CREATE POLICY "Users can view their own lifetime subscription"
ON public.lifetime_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Adjuk hozzá a pro örökös előfizetést a megadott felhasználónak
INSERT INTO public.lifetime_subscriptions (user_id, tier, notes)
SELECT id, 'pro', 'Örökös pro előfizetés - Admin által beállítva'
FROM auth.users
WHERE email = 'lollipopp23@gmail.com';