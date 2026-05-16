-- M3: Korrekciós bizonylatok (stornó / helyesbítés / ellentételezés) és negatív egyenleg tiltása

-- 1.a Korrekciós kapcsolat-mezők
ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS corrects_entry_id uuid REFERENCES public.cash_entries(id),
  ADD COLUMN IF NOT EXISTS correction_type text
    CHECK (correction_type IN ('storno','helyesbites','ellentetelezes')),
  ADD COLUMN IF NOT EXISTS correction_reason text,
  ADD COLUMN IF NOT EXISTS original_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS corrected_amount numeric(14,2);

CREATE INDEX IF NOT EXISTS idx_cash_entries_corrects
  ON public.cash_entries(corrects_entry_id);

-- 1.b Korrekciós validáció (fut a sorszám-kiosztás ELŐTT az 'aa' prefix miatt)
CREATE OR REPLACE FUNCTION public.validate_cash_correction()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_orig public.cash_entries%ROWTYPE;
BEGIN
  IF NEW.document_type IN ('STO','HEL','ELL')
     AND NEW.status = 'veglegesitett'
     AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status = 'piszkozat') THEN

    IF NEW.corrects_entry_id IS NULL THEN
      RAISE EXCEPTION 'Korrekciós bizonylathoz kötelező az eredeti bizonylat megjelölése.';
    END IF;
    IF NEW.correction_type IS NULL THEN
      RAISE EXCEPTION 'A korrekció típusa kötelező (storno/helyesbites/ellentetelezes).';
    END IF;
    IF NEW.correction_reason IS NULL OR length(trim(NEW.correction_reason)) < 3 THEN
      RAISE EXCEPTION 'A korrekció indoklása kötelező (Sztv. bizonylati fegyelem).';
    END IF;

    SELECT * INTO v_orig FROM public.cash_entries WHERE id = NEW.corrects_entry_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A hivatkozott eredeti bizonylat nem létezik.';
    END IF;
    IF v_orig.status = 'piszkozat' THEN
      RAISE EXCEPTION 'Piszkozatot nem kell stornózni — szerkeszd vagy töröld közvetlenül.';
    END IF;
    IF v_orig.cash_register_id <> NEW.cash_register_id THEN
      RAISE EXCEPTION 'A korrekciós bizonylat ugyanabba a pénztárba kell tartozzon, mint az eredeti.';
    END IF;

    -- STORNÓ szabályok
    IF NEW.correction_type = 'storno' THEN
      IF NEW.document_type <> 'STO' THEN
        RAISE EXCEPTION 'Stornó esetén a bizonylattípus STO kell legyen.';
      END IF;
      IF v_orig.status = 'stornozott' THEN
        RAISE EXCEPTION 'Ez a bizonylat már stornózva van.';
      END IF;
      IF v_orig.status = 'helyesbitett' THEN
        RAISE EXCEPTION 'Helyesbített bizonylat nem stornózható.';
      END IF;
      IF NEW.amount <> v_orig.amount THEN
        RAISE EXCEPTION 'A stornó összege meg kell egyezzen az eredetivel (%).', v_orig.amount;
      END IF;
      IF NEW.entry_type = v_orig.entry_type THEN
        RAISE EXCEPTION 'A stornó iránya ellentétes kell legyen az eredetivel.';
      END IF;
    END IF;

    -- HELYESBÍTÉS szabályok
    IF NEW.correction_type = 'helyesbites' THEN
      IF NEW.document_type <> 'HEL' THEN
        RAISE EXCEPTION 'Helyesbítés esetén a bizonylattípus HEL kell legyen.';
      END IF;
      IF v_orig.status IN ('stornozott','helyesbitett') THEN
        RAISE EXCEPTION 'Ez a bizonylat már stornózva/helyesbítve van.';
      END IF;
      IF NEW.original_amount IS NULL OR NEW.corrected_amount IS NULL THEN
        RAISE EXCEPTION 'Helyesbítésnél az eredeti és a helyes érték is kötelező.';
      END IF;
    END IF;

    -- ELLENTÉTELEZÉS szabályok
    IF NEW.correction_type = 'ellentetelezes' THEN
      IF NEW.document_type <> 'ELL' THEN
        RAISE EXCEPTION 'Ellentételezés esetén a bizonylattípus ELL kell legyen.';
      END IF;
      IF NEW.entry_type = v_orig.entry_type THEN
        RAISE EXCEPTION 'Az ellentételezés iránya ellentétes kell legyen az eredetivel.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_aa_correction ON public.cash_entries;
CREATE TRIGGER trg_cash_aa_correction
  BEFORE INSERT OR UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_cash_correction();

-- 1.c Eredeti bizonylat státusz-frissítése a korrekció véglegesítésekor
CREATE OR REPLACE FUNCTION public.apply_cash_correction_status()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.document_type IN ('STO','HEL')
     AND NEW.status = 'veglegesitett'
     AND NEW.corrects_entry_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status = 'piszkozat') THEN
    IF NEW.correction_type = 'storno' THEN
      UPDATE public.cash_entries SET status = 'stornozott'
        WHERE id = NEW.corrects_entry_id AND status = 'veglegesitett';
    ELSIF NEW.correction_type = 'helyesbites' THEN
      UPDATE public.cash_entries SET status = 'helyesbitett'
        WHERE id = NEW.corrects_entry_id AND status = 'veglegesitett';
    END IF;
    -- ELL: új valós esemény, eredeti státusza NEM változik
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_correction_status ON public.cash_entries;
CREATE TRIGGER trg_cash_correction_status
  AFTER INSERT OR UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.apply_cash_correction_status();

-- 1.d Immutabilitás kiterjesztése: státusz-átmenetek szabályozása
-- Veglegesitett -> stornozott / helyesbitett MEHET (a korrekciós trigger állítja),
-- visszafelé sosem; tartalmi mezők védve maradnak; sorszám-mezők védve maradnak.
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

    -- Tartalom védelme
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.entry_type IS DISTINCT FROM OLD.entry_type
       OR NEW.event_date IS DISTINCT FROM OLD.event_date
       OR NEW.category IS DISTINCT FROM OLD.category
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.partner_name IS DISTINCT FROM OLD.partner_name
       OR NEW.amount_in_words IS DISTINCT FROM OLD.amount_in_words
       OR NEW.document_type IS DISTINCT FROM OLD.document_type
       OR NEW.cash_register_id IS DISTINCT FROM OLD.cash_register_id
       OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
       OR NEW.corrects_entry_id IS DISTINCT FROM OLD.corrects_entry_id
       OR NEW.correction_type IS DISTINCT FROM OLD.correction_type
       OR NEW.correction_reason IS DISTINCT FROM OLD.correction_reason
       OR NEW.original_amount IS DISTINCT FROM OLD.original_amount
       OR NEW.corrected_amount IS DISTINCT FROM OLD.corrected_amount THEN
      RAISE EXCEPTION 'Véglegesített pénztárbizonylat tartalma nem módosítható (Sztv. 165. §). Csak stornó/helyesbítés lehetséges.';
    END IF;

    -- Sorszám-mezők védelme
    IF (OLD.document_number IS NOT NULL AND NEW.document_number IS DISTINCT FROM OLD.document_number)
       OR (OLD.seq_number IS NOT NULL AND NEW.seq_number IS DISTINCT FROM OLD.seq_number)
       OR (OLD.seq_year IS NOT NULL AND NEW.seq_year IS DISTINCT FROM OLD.seq_year) THEN
      RAISE EXCEPTION 'A bizonylat sorszáma nem módosítható (Sztv. 168. §).';
    END IF;

    -- Státusz-átmenetek szabályozása (csak megengedett irányok)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'veglegesitett' AND NEW.status IN ('stornozott','helyesbitett'))
      ) THEN
        RAISE EXCEPTION 'Nem engedélyezett státusz-átmenet: % -> %.', OLD.status, NEW.status;
      END IF;
    END IF;

    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- 1.e Negatív egyenleg tiltása (NAV / Sztv.)
CREATE OR REPLACE FUNCTION public.enforce_non_negative_cash_balance()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_opening numeric(14,2);
  v_balance numeric(14,2);
BEGIN
  IF NEW.status = 'veglegesitett'
     AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status = 'piszkozat') THEN

    SELECT opening_balance INTO v_opening
      FROM public.cash_registers WHERE id = NEW.cash_register_id;

    SELECT COALESCE(v_opening, 0)
      + COALESCE(SUM(CASE WHEN entry_type = 'bevetel' THEN amount ELSE -amount END), 0)
    INTO v_balance
    FROM public.cash_entries
    WHERE cash_register_id = NEW.cash_register_id
      AND status = 'veglegesitett'
      AND id <> NEW.id;

    v_balance := v_balance
      + CASE WHEN NEW.entry_type = 'bevetel' THEN NEW.amount ELSE -NEW.amount END;

    IF v_balance < 0 THEN
      RAISE EXCEPTION 'A művelet a pénztáregyenleget negatívba vinné (% Ft). Házipénztárban negatív egyenleg nem megengedett (Sztv., NAV).', v_balance;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_nonneg ON public.cash_entries;
CREATE TRIGGER trg_cash_nonneg
  BEFORE INSERT OR UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_non_negative_cash_balance();