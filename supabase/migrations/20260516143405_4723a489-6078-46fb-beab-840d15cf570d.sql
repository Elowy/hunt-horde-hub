
-- 1) invoices.payment_method
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_method text;

-- 2) cash_registers
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_society_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'HUF',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_registers_society ON public.cash_registers(hunter_society_id);
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society manages own cash registers"
  ON public.cash_registers FOR ALL
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_cash_registers_updated_at
  BEFORE UPDATE ON public.cash_registers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) cash_entries
CREATE TABLE IF NOT EXISTS public.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  hunter_society_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('bevetel','kiadas')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  category text,
  description text,
  reference_number text,
  source_type text,
  source_id uuid,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
  -- TODO: 2. fázis - storno_of_id, is_stornoed, sequential_number, locked_at
);
CREATE INDEX IF NOT EXISTS idx_cash_entries_register ON public.cash_entries(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_society ON public.cash_entries(hunter_society_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_date ON public.cash_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_entries_source ON public.cash_entries(source_type, source_id);
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society views own cash entries"
  ON public.cash_entries FOR SELECT
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Society creates own cash entries"
  ON public.cash_entries FOR INSERT
  WITH CHECK (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

-- TODO: 2. fázis - UPDATE/DELETE zárolása lezárt tételeknél
CREATE POLICY "Society updates own cash entries"
  ON public.cash_entries FOR UPDATE
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Society deletes own cash entries"
  ON public.cash_entries FOR DELETE
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

-- 4) Trigger: készpénzes számla -> pénztári bevétel
CREATE OR REPLACE FUNCTION public.cash_entry_from_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_register uuid;
BEGIN
  IF NEW.payment_method = 'Készpénz' AND NEW.status = 'issued' THEN
    SELECT id INTO default_register
    FROM public.cash_registers
    WHERE hunter_society_id = NEW.hunter_society_id AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF default_register IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.cash_entries
      WHERE source_type = 'invoice' AND source_id = NEW.id
    ) THEN
      INSERT INTO public.cash_entries (
        cash_register_id, hunter_society_id, entry_type, amount,
        entry_date, category, description, reference_number,
        source_type, source_id, created_by
      ) VALUES (
        default_register, NEW.hunter_society_id, 'bevetel', NEW.gross_amount,
        CURRENT_DATE, 'Vad értékesítés (számla)',
        'Automatikus tétel a(z) ' || COALESCE(NEW.szamlazz_invoice_number, NEW.id::text) || ' számlából',
        NEW.szamlazz_invoice_number,
        'invoice', NEW.id, NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_from_invoice ON public.invoices;
CREATE TRIGGER trg_cash_from_invoice
  AFTER INSERT OR UPDATE OF status, payment_method ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.cash_entry_from_invoice();

-- 5) Trigger: kifizetett tagdíj -> pénztári bevétel
-- membership_payments séma: hunter_society_id, user_id, amount, paid (bool), paid_at, paid_by, season_year, period
CREATE OR REPLACE FUNCTION public.cash_entry_from_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_register uuid;
  creator uuid;
BEGIN
  IF NEW.paid = TRUE AND (TG_OP = 'INSERT' OR OLD.paid IS DISTINCT FROM TRUE) THEN
    SELECT id INTO default_register
    FROM public.cash_registers
    WHERE hunter_society_id = NEW.hunter_society_id AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    creator := COALESCE(NEW.paid_by, NEW.user_id);

    IF default_register IS NOT NULL AND creator IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.cash_entries
      WHERE source_type = 'membership' AND source_id = NEW.id
    ) THEN
      INSERT INTO public.cash_entries (
        cash_register_id, hunter_society_id, entry_type, amount,
        entry_date, category, description,
        source_type, source_id, created_by
      ) VALUES (
        default_register, NEW.hunter_society_id, 'bevetel', NEW.amount,
        COALESCE(NEW.paid_at::date, CURRENT_DATE), 'Tagdíj',
        'Automatikus tétel tagdíj befizetésből: ' || NEW.season_year || ' - ' || NEW.period,
        'membership', NEW.id, creator
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_from_membership ON public.membership_payments;
CREATE TRIGGER trg_cash_from_membership
  AFTER INSERT OR UPDATE OF paid ON public.membership_payments
  FOR EACH ROW EXECUTE FUNCTION public.cash_entry_from_membership();
