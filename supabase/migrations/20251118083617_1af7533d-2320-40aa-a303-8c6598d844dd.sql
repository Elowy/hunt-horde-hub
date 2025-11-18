-- Create enum for membership payment periods
CREATE TYPE public.membership_period AS ENUM ('first_half', 'second_half', 'full_year');

-- Create membership fee settings table
CREATE TABLE public.membership_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_society_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  first_half_amount NUMERIC NOT NULL DEFAULT 0,
  second_half_amount NUMERIC NOT NULL DEFAULT 0,
  full_year_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hunter_society_id, season_year)
);

-- Create membership payments table
CREATE TABLE public.membership_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_society_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  period public.membership_period NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hunter_society_id, user_id, season_year, period)
);

-- Enable RLS
ALTER TABLE public.membership_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for membership_fee_settings
CREATE POLICY "Hunter societies can manage their own fee settings"
ON public.membership_fee_settings
FOR ALL
USING (
  auth.uid() = hunter_society_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  auth.uid() = hunter_society_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Members can view their society's fee settings"
ON public.membership_fee_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND hunter_society_id = membership_fee_settings.hunter_society_id
  )
);

-- RLS Policies for membership_payments
CREATE POLICY "Admins and editors can manage all payments"
ON public.membership_payments
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND id = membership_payments.hunter_society_id
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND id = membership_payments.hunter_society_id
    )
  )
);

CREATE POLICY "Users can view their own payments"
ON public.membership_payments
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create indexes for better performance
CREATE INDEX idx_membership_fee_settings_society ON public.membership_fee_settings(hunter_society_id);
CREATE INDEX idx_membership_fee_settings_season ON public.membership_fee_settings(season_year);
CREATE INDEX idx_membership_payments_society ON public.membership_payments(hunter_society_id);
CREATE INDEX idx_membership_payments_user ON public.membership_payments(user_id);
CREATE INDEX idx_membership_payments_season ON public.membership_payments(season_year);
CREATE INDEX idx_membership_payments_paid ON public.membership_payments(paid);

-- Create triggers for updated_at
CREATE TRIGGER update_membership_fee_settings_updated_at
  BEFORE UPDATE ON public.membership_fee_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_membership_payments_updated_at
  BEFORE UPDATE ON public.membership_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();