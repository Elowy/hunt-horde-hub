-- Régi teszt-adat törlése
TRUNCATE TABLE public.cash_entries CASCADE;

-- cash_entries bizonylattá alakítása
ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'BPB'
    CHECK (document_type IN ('BPB','KPB','STO','HEL','ELL')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'piszkozat'
    CHECK (status IN ('piszkozat','veglegesitett','rontott','stornozott','helyesbitett')),
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS amount_in_words text,
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS partner_tax_id text,
  ADD COLUMN IF NOT EXISTS ordered_by text,
  ADD COLUMN IF NOT EXISTS related_document_ref text,
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz;

COMMENT ON COLUMN public.cash_entries.status IS 'piszkozat: szerkeszthető, sorszám nélkül. veglegesitett: immutable, sorszámot kap (M2). rontott/stornozott/helyesbitett: M2-M3.';

-- cash_policy
CREATE TABLE IF NOT EXISTS public.cash_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_society_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cash_register_id uuid REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  max_cash_balance numeric(14,2),
  closing_cycle text NOT NULL DEFAULT 'napi'
    CHECK (closing_cycle IN ('napi','heti','havi')),
  require_signature boolean NOT NULL DEFAULT false,
  digital_only boolean NOT NULL DEFAULT true,
  retention_years integer NOT NULL DEFAULT 8 CHECK (retention_years >= 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_cash_policy_society ON public.cash_policy(hunter_society_id);
ALTER TABLE public.cash_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Society manages own cash policy" ON public.cash_policy;
CREATE POLICY "Society manages own cash policy"
  ON public.cash_policy FOR ALL
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

DROP TRIGGER IF EXISTS trg_cash_policy_updated_at ON public.cash_policy;
CREATE TRIGGER trg_cash_policy_updated_at
  BEFORE UPDATE ON public.cash_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- cash_categories
CREATE TABLE IF NOT EXISTS public.cash_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_society_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('bevetel','kiadas','mindketto')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hunter_society_id, code)
);
ALTER TABLE public.cash_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Society manages own categories" ON public.cash_categories;
CREATE POLICY "Society manages own categories"
  ON public.cash_categories FOR ALL
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

-- Immutabilitás (Sztv. 165./168. §)
CREATE OR REPLACE FUNCTION public.enforce_cash_entry_immutability()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'piszkozat' THEN
      RAISE EXCEPTION 'Véglegesített pénztárbizonylat nem törölhető (Sztv. 168. §). Használj stornót.';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'piszkozat' THEN
      RETURN NEW;
    END IF;
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.entry_type IS DISTINCT FROM OLD.entry_type
       OR NEW.event_date IS DISTINCT FROM OLD.event_date
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.partner_name IS DISTINCT FROM OLD.partner_name
       OR NEW.amount_in_words IS DISTINCT FROM OLD.amount_in_words
       OR NEW.document_type IS DISTINCT FROM OLD.document_type
       OR NEW.cash_register_id IS DISTINCT FROM OLD.cash_register_id
       OR NEW.issued_at IS DISTINCT FROM OLD.issued_at THEN
      RAISE EXCEPTION 'Véglegesített pénztárbizonylat tartalma nem módosítható (Sztv. 165. §). Csak stornó/helyesbítés lehetséges.';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_immutability ON public.cash_entries;
CREATE TRIGGER trg_cash_immutability
  BEFORE UPDATE OR DELETE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_entry_immutability();

-- Kötelező mezők véglegesítéskor (Sztv. 167. §)
CREATE OR REPLACE FUNCTION public.validate_cash_entry_finalization()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'veglegesitett' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status = 'piszkozat') THEN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Az összeg kötelező és pozitív (Sztv. 167. §).';
    END IF;
    IF NEW.event_date IS NULL THEN
      RAISE EXCEPTION 'A gazdasági esemény dátuma kötelező (Sztv. 167. §).';
    END IF;
    IF NEW.event_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'A gazdasági esemény dátuma nem lehet jövőbeli.';
    END IF;
    IF NEW.category IS NULL OR NEW.category = '' THEN
      RAISE EXCEPTION 'A jogcím kötelező (Sztv. 167. §).';
    END IF;
    IF NEW.amount_in_words IS NULL OR NEW.amount_in_words = '' THEN
      RAISE EXCEPTION 'Az összeg betűs alakja kötelező.';
    END IF;
    IF NEW.partner_name IS NULL OR NEW.partner_name = '' THEN
      RAISE EXCEPTION 'A befizető/átvevő megnevezése kötelező.';
    END IF;
    NEW.issued_at := COALESCE(NEW.issued_at, now());
    NEW.issued_by := COALESCE(NEW.issued_by, auth.uid());
    NEW.recorded_at := COALESCE(NEW.recorded_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_validate ON public.cash_entries;
CREATE TRIGGER trg_cash_validate
  BEFORE INSERT OR UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_cash_entry_finalization();

-- Automatika-triggerek igazítása: piszkozat státusszal
CREATE OR REPLACE FUNCTION public.cash_entry_from_invoice()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
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
        entry_date, event_date, category, description, reference_number,
        partner_name, related_document_ref,
        document_type, status,
        source_type, source_id, created_by
      ) VALUES (
        default_register, NEW.hunter_society_id, 'bevetel', NEW.gross_amount,
        CURRENT_DATE, CURRENT_DATE, 'Vad értékesítés (számla)',
        'Automatikus piszkozat a(z) ' || COALESCE(NEW.szamlazz_invoice_number, NEW.id::text) || ' számlából',
        NEW.szamlazz_invoice_number,
        COALESCE(NEW.buyer_name, ''),
        NEW.szamlazz_invoice_number,
        'BPB', 'piszkozat',
        'invoice', NEW.id, NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cash_entry_from_membership()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  default_register uuid;
  creator uuid;
  partner text;
BEGIN
  IF NEW.paid = TRUE AND (TG_OP = 'INSERT' OR OLD.paid IS DISTINCT FROM TRUE) THEN
    SELECT id INTO default_register
    FROM public.cash_registers
    WHERE hunter_society_id = NEW.hunter_society_id AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    creator := COALESCE(NEW.paid_by, NEW.user_id);

    SELECT COALESCE(contact_name, company_name, '') INTO partner
    FROM public.profiles WHERE id = NEW.user_id;

    IF default_register IS NOT NULL AND creator IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.cash_entries
      WHERE source_type = 'membership' AND source_id = NEW.id
    ) THEN
      INSERT INTO public.cash_entries (
        cash_register_id, hunter_society_id, entry_type, amount,
        entry_date, event_date, category, description,
        partner_name,
        document_type, status,
        source_type, source_id, created_by
      ) VALUES (
        default_register, NEW.hunter_society_id, 'bevetel', NEW.amount,
        COALESCE(NEW.paid_at::date, CURRENT_DATE),
        COALESCE(NEW.paid_at::date, CURRENT_DATE),
        'Tagdíj',
        'Automatikus piszkozat tagdíj befizetésből: ' || NEW.season_year || ' - ' || NEW.period,
        COALESCE(partner, ''),
        'BPB', 'piszkozat',
        'membership', NEW.id, creator
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;