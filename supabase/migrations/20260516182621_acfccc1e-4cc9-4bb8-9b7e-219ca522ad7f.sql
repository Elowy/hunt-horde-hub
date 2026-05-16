
-- 1.a Pénztárkód
ALTER TABLE public.cash_registers ADD COLUMN IF NOT EXISTS register_code text;

DO $outer$
DECLARE
  s_rec RECORD;
  r_rec RECORD;
  i int;
BEGIN
  FOR s_rec IN SELECT DISTINCT hunter_society_id FROM public.cash_registers LOOP
    i := 1;
    FOR r_rec IN
      SELECT id FROM public.cash_registers
      WHERE hunter_society_id = s_rec.hunter_society_id
      ORDER BY created_at
    LOOP
      UPDATE public.cash_registers
        SET register_code = 'KP' || LPAD(i::text, 2, '0')
        WHERE id = r_rec.id AND register_code IS NULL;
      i := i + 1;
    END LOOP;
  END LOOP;
END
$outer$;

ALTER TABLE public.cash_registers ALTER COLUMN register_code SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_register_code_per_society'
  ) THEN
    ALTER TABLE public.cash_registers
      ADD CONSTRAINT uq_register_code_per_society UNIQUE (hunter_society_id, register_code);
  END IF;
END $$;

-- 1.b Sorszám oszlopok
ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS seq_year integer,
  ADD COLUMN IF NOT EXISTS seq_number integer,
  ADD COLUMN IF NOT EXISTS document_number text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_cash_entry_seq'
  ) THEN
    ALTER TABLE public.cash_entries
      ADD CONSTRAINT uq_cash_entry_seq
      UNIQUE (cash_register_id, document_type, seq_year, seq_number);
  END IF;
END $$;

-- 1.c Szekvencia állapot
CREATE TABLE IF NOT EXISTS public.cash_sequences (
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  seq_year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (cash_register_id, document_type, seq_year)
);
ALTER TABLE public.cash_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Society reads own sequences" ON public.cash_sequences;
CREATE POLICY "Society reads own sequences"
  ON public.cash_sequences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cash_registers cr
    WHERE cr.id = cash_register_id
      AND (cr.hunter_society_id = auth.uid()
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

-- 1.d Sorszám-kiosztó trigger
CREATE OR REPLACE FUNCTION public.assign_cash_document_number()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_year integer;
  v_next integer;
  v_code text;
BEGIN
  IF NEW.status = 'veglegesitett'
     AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status = 'piszkozat')
     AND NEW.document_number IS NULL THEN

    IF NEW.event_date IS NULL THEN
      RAISE EXCEPTION 'A gazdasági esemény dátuma kötelező a sorszámhoz.';
    END IF;

    v_year := EXTRACT(YEAR FROM NEW.event_date)::integer;

    INSERT INTO public.cash_sequences (cash_register_id, document_type, seq_year, last_number)
      VALUES (NEW.cash_register_id, NEW.document_type, v_year, 1)
    ON CONFLICT (cash_register_id, document_type, seq_year)
      DO UPDATE SET last_number = public.cash_sequences.last_number + 1
    RETURNING last_number INTO v_next;

    SELECT register_code INTO v_code
      FROM public.cash_registers WHERE id = NEW.cash_register_id;

    NEW.seq_year := v_year;
    NEW.seq_number := v_next;
    NEW.document_number := v_code || '-' || NEW.document_type || '-'
      || v_year::text || '-' || LPAD(v_next::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_zz_assign_number ON public.cash_entries;
CREATE TRIGGER trg_cash_zz_assign_number
  BEFORE INSERT OR UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.assign_cash_document_number();

-- 1.e Immutabilitás kiterjesztése a sorszám-mezőkre
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
    -- Sorszám-mezők védelme (kivéve az első kiosztás)
    IF (OLD.document_number IS NOT NULL AND NEW.document_number IS DISTINCT FROM OLD.document_number)
       OR (OLD.seq_number IS NOT NULL AND NEW.seq_number IS DISTINCT FROM OLD.seq_number)
       OR (OLD.seq_year IS NOT NULL AND NEW.seq_year IS DISTINCT FROM OLD.seq_year) THEN
      RAISE EXCEPTION 'A bizonylat sorszáma nem módosítható (Sztv. 168. §).';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- 1.f Hézag-detektáló view
CREATE OR REPLACE VIEW public.cash_sequence_gaps AS
WITH seq AS (
  SELECT
    cash_register_id,
    document_type,
    seq_year,
    seq_number,
    LEAD(seq_number) OVER (
      PARTITION BY cash_register_id, document_type, seq_year
      ORDER BY seq_number) AS next_number
  FROM public.cash_entries
  WHERE seq_number IS NOT NULL
)
SELECT * FROM seq
WHERE next_number IS NOT NULL AND next_number <> seq_number + 1;
