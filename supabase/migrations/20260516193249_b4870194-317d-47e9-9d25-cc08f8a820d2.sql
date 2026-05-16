
-- 1.a Zárási rekordok
CREATE TABLE IF NOT EXISTS public.cash_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  hunter_society_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  closing_seq_year integer NOT NULL,
  closing_seq_number integer NOT NULL,
  closing_number text NOT NULL,
  opening_balance numeric(14,2) NOT NULL,
  total_income numeric(14,2) NOT NULL,
  total_expense numeric(14,2) NOT NULL,
  closing_balance numeric(14,2) NOT NULL,
  counted_cash numeric(14,2),
  difference numeric(14,2),
  difference_note text,
  status text NOT NULL DEFAULT 'lezart' CHECK (status IN ('lezart','ujranyitott')),
  pdf_path text,
  closed_by uuid NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  reopen_reason text,
  reopened_at timestamptz,
  reopened_by uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cash_register_id, closing_seq_year, closing_seq_number)
);
CREATE INDEX IF NOT EXISTS idx_cash_closings_register ON public.cash_closings(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_closings_period ON public.cash_closings(period_start, period_end);

ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Society manages own closings" ON public.cash_closings;
CREATE POLICY "Society manages own closings"
  ON public.cash_closings FOR ALL
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (hunter_society_id = auth.uid() OR has_role(auth.uid(),'super_admin'::app_role));

-- 1.b Címletjegyzék
CREATE TABLE IF NOT EXISTS public.cash_denominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id uuid NOT NULL REFERENCES public.cash_closings(id) ON DELETE CASCADE,
  denomination integer NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0)
);
CREATE INDEX IF NOT EXISTS idx_cash_denominations_closing ON public.cash_denominations(closing_id);
ALTER TABLE public.cash_denominations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Society manages own denominations" ON public.cash_denominations;
CREATE POLICY "Society manages own denominations"
  ON public.cash_denominations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.cash_closings c WHERE c.id = closing_id
    AND (c.hunter_society_id = auth.uid() OR has_role(auth.uid(),'super_admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cash_closings c WHERE c.id = closing_id
    AND (c.hunter_society_id = auth.uid() OR has_role(auth.uid(),'super_admin'::app_role))));

-- 1.c PJ sorszám: cash_sequences-be (cash_register_id, 'PJ', év)
-- Atomikus kiosztás BEFORE INSERT-tel
CREATE OR REPLACE FUNCTION public.assign_cash_closing_number()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_year integer;
  v_next integer;
  v_code text;
BEGIN
  IF NEW.closing_number IS NULL OR NEW.closing_seq_number IS NULL THEN
    v_year := EXTRACT(YEAR FROM NEW.period_end)::integer;

    INSERT INTO public.cash_sequences (cash_register_id, document_type, seq_year, last_number)
      VALUES (NEW.cash_register_id, 'PJ', v_year, 1)
    ON CONFLICT (cash_register_id, document_type, seq_year)
      DO UPDATE SET last_number = public.cash_sequences.last_number + 1
    RETURNING last_number INTO v_next;

    SELECT register_code INTO v_code FROM public.cash_registers WHERE id = NEW.cash_register_id;

    NEW.closing_seq_year := v_year;
    NEW.closing_seq_number := v_next;
    NEW.closing_number := v_code || '-PJ-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_cash_closing_number ON public.cash_closings;
CREATE TRIGGER trg_assign_cash_closing_number
  BEFORE INSERT ON public.cash_closings
  FOR EACH ROW EXECUTE FUNCTION public.assign_cash_closing_number();

-- 1.d Lezárt időszak fagyasztása
CREATE OR REPLACE FUNCTION public.enforce_closed_period()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_closed_until date;
BEGIN
  IF NEW.status = 'veglegesitett' AND NEW.event_date IS NOT NULL THEN
    SELECT MAX(period_end) INTO v_closed_until
    FROM public.cash_closings
    WHERE cash_register_id = NEW.cash_register_id AND status = 'lezart';

    IF v_closed_until IS NOT NULL AND NEW.event_date <= v_closed_until THEN
      RAISE EXCEPTION 'A(z) % napra eso idoszak mar lezart (utolso zart nap: %). Lezart idoszakba bizonylat nem rogzitheto.', NEW.event_date, v_closed_until;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_closed_period ON public.cash_entries;
CREATE TRIGGER trg_cash_closed_period
  BEFORE INSERT OR UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_closed_period();
