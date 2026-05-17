-- M6: Lezárt időszak archiválása + integritás-verifikáció
--
-- ============================================================
-- M6 ARCHIVE HASH SPECIFIKÁCIÓ (v1.0)
-- ============================================================
-- Algoritmus   : SHA-256, lowercase hex
--                extensions.digest() — pgcrypto az 'extensions' sémában (CLAUDE.md)
-- Granularitás : cash_closings soronként, 1 archív hash / zárás
-- Shared helper: compute_closing_canonical(p_closing public.cash_closings) RETURNS text
--                Hívja: archive_cash_closing() trigger ÉS verify_closing_integrity()
--                NEM duplikált — mindkettő ezt a függvényt hívja.
--
-- Hash-input: closing_canonical || chr(10) || entry1_canonical || chr(10) || ...
-- (Ha nincs entry a periódusban: csak closing_canonical)
--
-- 1. Closing canonical — 13 mező, ABC kulcssorrend, escape-lt:
--    cash_register_id={uuid::text}
--    |closed_at={YYYY-MM-DD"T"HH24:MI:SS.US"Z" UTC}
--    |closed_by={uuid::text}
--    |closing_balance={ROUND(x,2)::text}
--    |closing_number={escaped}
--    |counted_cash={ROUND(x,2)::text  — '' ha NULL}
--    |difference={ROUND(x,2)::text    — '' ha NULL}
--    |opening_balance={ROUND(x,2)::text}
--    |period_end={YYYY-MM-DD}
--    |period_start={YYYY-MM-DD}
--    |status={escaped}
--    |total_expense={ROUND(x,2)::text}
--    |total_income={ROUND(x,2)::text}
--
-- 2. Per-entry canonical — 7 mező, ABC kulcssorrend, escape-lt:
--    amount={ROUND(x,2)::text}
--    |document_number={escaped — '' ha NULL}
--    |document_type={escaped}
--    |entry_type={escaped}
--    |event_date={YYYY-MM-DD — '' ha NULL}
--    |partner_name={escaped — '' ha NULL}
--    |status={escaped}
--
-- Entry szűrő  : status IN ('veglegesitett','stornozott','helyesbitett')
--                Konzisztens az egyenleg-szabállyal (M3): piszkozat és rontott kizárva.
-- Entry sorrend: document_number ASC NULLS LAST, id ASC
-- Soreválasztó : chr(10) — LF, ASCII 10. Értékekben chr(10) nem escaped (dokumentált korlát).
-- Escape       : cash_escape_canonical() (M5): \ → \\ ELŐBB, azután | → \|
-- ============================================================

-- ============================================================
-- 1. Tábla-változások
-- ============================================================
ALTER TABLE public.cash_closings
  ADD COLUMN IF NOT EXISTS archived_at  timestamptz,
  ADD COLUMN IF NOT EXISTS archive_hash text,
  ADD COLUMN IF NOT EXISTS retain_until date;

-- Retenciós évek alapja a cash_policy-ban (NAV minimum: 8 év)
ALTER TABLE public.cash_policy
  ADD COLUMN IF NOT EXISTS retention_years integer NOT NULL DEFAULT 8;

-- ============================================================
-- 2. compute_closing_canonical — megosztott kanonikus helper
-- Paraméter: cash_closings kompozit típus.
--   - A BEFORE INSERT triggerben NEW (cash_closings típusú) kerül átadásra.
--   - verify_closing_integrity-ben %ROWTYPE változó kerül átadásra.
-- SECURITY DEFINER: hívja a BEFORE INSERT trigger (postgres ownerként fut)
-- és verify_closing_integrity (szintén SECURITY DEFINER).
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_closing_canonical(p_closing public.cash_closings)
RETURNS text LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_canon text;
  v_entry record;
BEGIN
  -- Closing canonical: 13 mező, ABC kulcssorrend
  v_canon :=
      'cash_register_id=' || cash_escape_canonical(p_closing.cash_register_id::text)
    || '|closed_at='       || to_char(p_closing.closed_at AT TIME ZONE 'UTC',
                                      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    || '|closed_by='       || cash_escape_canonical(p_closing.closed_by::text)
    || '|closing_balance=' || ROUND(p_closing.closing_balance, 2)::text
    || '|closing_number='  || cash_escape_canonical(p_closing.closing_number)
    || '|counted_cash='    || COALESCE(ROUND(p_closing.counted_cash,  2)::text, '')
    || '|difference='      || COALESCE(ROUND(p_closing.difference,     2)::text, '')
    || '|opening_balance=' || ROUND(p_closing.opening_balance, 2)::text
    || '|period_end='      || to_char(p_closing.period_end,   'YYYY-MM-DD')
    || '|period_start='    || to_char(p_closing.period_start, 'YYYY-MM-DD')
    || '|status='          || cash_escape_canonical(p_closing.status)
    || '|total_expense='   || ROUND(p_closing.total_expense,  2)::text
    || '|total_income='    || ROUND(p_closing.total_income,   2)::text;

  -- Per-entry canonical: 7 mező, ABC kulcssorrend, chr(10) soreválasztó
  -- status szűrő: csak az egyenlegbe beleszámított tételek (M3 szabály)
  FOR v_entry IN
    SELECT amount, document_number, document_type, entry_type,
           event_date, partner_name, status
    FROM   public.cash_entries
    WHERE  cash_register_id = p_closing.cash_register_id
      AND  event_date BETWEEN p_closing.period_start AND p_closing.period_end
      AND  status IN ('veglegesitett', 'stornozott', 'helyesbitett')
    ORDER BY document_number ASC NULLS LAST, id ASC
  LOOP
    v_canon := v_canon
      || chr(10)
      || 'amount='           || ROUND(v_entry.amount, 2)::text
      || '|document_number=' || cash_escape_canonical(v_entry.document_number)
      || '|document_type='   || cash_escape_canonical(v_entry.document_type)
      || '|entry_type='      || cash_escape_canonical(v_entry.entry_type)
      || '|event_date='      || COALESCE(to_char(v_entry.event_date, 'YYYY-MM-DD'), '')
      || '|partner_name='    || cash_escape_canonical(v_entry.partner_name)
      || '|status='          || cash_escape_canonical(v_entry.status);
  END LOOP;

  RETURN v_canon;
END;
$$;

-- ============================================================
-- 3. archive_cash_closing — BEFORE INSERT trigger function
-- Trigger-sorrend (BEFORE INSERT, cash_closings, ABC):
--   trg_assign_cash_closing_number  ('assign' < 'cash_m6' → előbb fut)
--   trg_cash_m6_archive             ← ez fut másodikként
-- Tehát NEW.closing_number már ki van töltve, amikor compute_closing_canonical(NEW) lefut.
-- NEW.closed_at: DEFAULT now() — a DEFAULT-ok a BEFORE triggerek előtt töltődnek ki.
-- ============================================================
CREATE OR REPLACE FUNCTION public.archive_cash_closing()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_retention integer;
BEGIN
  IF NEW.status != 'lezart' THEN
    RETURN NEW;
  END IF;

  SELECT retention_years INTO v_retention
  FROM   public.cash_policy
  WHERE  cash_register_id = NEW.cash_register_id;
  v_retention := COALESCE(v_retention, 8);

  NEW.archived_at  := now();
  NEW.retain_until := NEW.closed_at::date + (v_retention * INTERVAL '1 year');
  NEW.archive_hash := encode(
    extensions.digest(
      public.compute_closing_canonical(NEW),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_m6_archive ON public.cash_closings;
CREATE TRIGGER trg_cash_m6_archive
  BEFORE INSERT ON public.cash_closings
  FOR EACH ROW EXECUTE FUNCTION public.archive_cash_closing();

-- ============================================================
-- 4. prevent_archive_hash_update — BEFORE UPDATE immutability
-- Ha OLD.archive_hash IS NOT NULL, se archive_hash, se archived_at
-- nem módosítható. A reopening (status: lezart → ujranyitott) megengedett,
-- mert az nem érinti az archív mezőket.
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_archive_hash_update()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.archive_hash IS NOT NULL AND (
       NEW.archive_hash IS DISTINCT FROM OLD.archive_hash
    OR NEW.archived_at  IS DISTINCT FROM OLD.archived_at
  ) THEN
    RAISE EXCEPTION
      'Az archiválási hash és időbélyeg nem módosítható (záró: %).', OLD.closing_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_archive_immutable ON public.cash_closings;
CREATE TRIGGER trg_cash_archive_immutable
  BEFORE UPDATE ON public.cash_closings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_archive_hash_update();

-- ============================================================
-- 5. verify_closing_integrity — publikus RPC, admin+ hívhatja
-- SECURITY DEFINER: hozzáfér a cash_closings sorhoz és a cash_entries-hez
-- RLS bypass nélkül is működne (admin+ RLS-sel), de SECURITY DEFINER
-- konzisztens a többi cash audit függvénnyel.
--
-- Visszatérési értékek:
--   valid=true  + stored_hash IS NOT NULL : hash egyezik, sértetlen
--   valid=false + stored_hash IS NOT NULL : hash-eltérés, adatmanipuláció lehetséges
--   stored_hash IS NULL                   : M6 előtt zárva, nincs archív hash
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_closing_integrity(p_closing_id uuid)
RETURNS jsonb LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_c        public.cash_closings%ROWTYPE;
  v_computed text;
BEGIN
  SELECT * INTO v_c FROM public.cash_closings WHERE id = p_closing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Záró rekord nem található: %', p_closing_id;
  END IF;

  IF NOT (
    cash_has_access(v_c.hunter_society_id, 'admin')
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Nincs jogosultság az integritás-ellenőrzéshez.';
  END IF;

  -- M6 előtti zárás: nincs archive_hash → nem hiba, csak hiányzó adat
  IF v_c.archive_hash IS NULL THEN
    RETURN jsonb_build_object(
      'valid',          false,
      'closing_number', v_c.closing_number,
      'period',         v_c.period_start::text || ' – ' || v_c.period_end::text,
      'stored_hash',    null,
      'computed_hash',  null,
      'checked_at',     now()
    );
  END IF;

  -- Hash újraszámítása — UGYANAZ a helper mint a BEFORE INSERT trigger
  v_computed := encode(
    extensions.digest(
      public.compute_closing_canonical(v_c),
      'sha256'
    ),
    'hex'
  );

  RETURN jsonb_build_object(
    'valid',          v_computed = v_c.archive_hash,
    'closing_number', v_c.closing_number,
    'period',         v_c.period_start::text || ' – ' || v_c.period_end::text,
    'stored_hash',    v_c.archive_hash,
    'computed_hash',  v_computed,
    'checked_at',     now()
  );
END;
$$;
