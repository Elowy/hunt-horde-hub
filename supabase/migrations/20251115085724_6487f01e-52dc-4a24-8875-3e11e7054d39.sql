-- Create subscription codes table
CREATE TABLE public.subscription_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  tier text NOT NULL, -- 'normal' or 'pro'
  duration text NOT NULL, -- 'monthly' or 'yearly'
  expires_at timestamp with time zone NOT NULL,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  notes text,
  CHECK (tier IN ('normal', 'pro')),
  CHECK (duration IN ('monthly', 'yearly'))
);

-- Enable RLS
ALTER TABLE public.subscription_codes ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all codes
CREATE POLICY "Super admins can manage all subscription codes"
ON public.subscription_codes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Users can view unredeemed codes (for redemption)
CREATE POLICY "Users can view unredeemed codes"
ON public.subscription_codes FOR SELECT
TO authenticated
USING (redeemed_by IS NULL AND expires_at > now());

-- Users can view their own redeemed codes
CREATE POLICY "Users can view their own redeemed codes"
ON public.subscription_codes FOR SELECT
TO authenticated
USING (redeemed_by = auth.uid());

-- Users can update codes they're redeeming (to mark as redeemed)
CREATE POLICY "Users can redeem codes"
ON public.subscription_codes FOR UPDATE
TO authenticated
USING (redeemed_by IS NULL AND expires_at > now())
WITH CHECK (redeemed_by = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_subscription_codes_code ON public.subscription_codes(code);
CREATE INDEX idx_subscription_codes_redeemed_by ON public.subscription_codes(redeemed_by);