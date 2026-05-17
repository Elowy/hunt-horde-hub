-- M5: Append-only hash-láncolt audit trail + Szerepkör-mátrix
--
-- ============================================================
-- HASH-LÁNC FORMÁTUM SPECIFIKÁCIÓ (v1.0)
-- PostgreSQL-verzió-független; reprodukálható 8+ évre (NAV-ellenőrzés)
-- ============================================================
-- Algoritmus : SHA-256, lowercase hex  (pgcrypto: encode(digest(…,'sha256'),'hex'))
-- Granularitás: cash_register_id szerinti lánc; első sor: prev_hash = 'GENESIS'
--
-- Hash input (|| UTF-8 konkatenáció):
--   COALESCE(entity_id::text, '')
--   || '|'
--   || to_char(event_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
--   || '|'
--   || event_type
--   || '|'
--   || COALESCE(payload_canonical, '')
--   || '|'
--   || prev_hash
--
-- payload_canonical formátum:
--   'key1=val1|key2=val2|...'  — kulcsok kódban rögzített ABC sorrendben
--   NULL értéke : 'key='        (üres string, nem 'NULL' szó)
--   Escape-sorrend (mindkét lépés kötelező, ebben a sorrendben):
--     1) minden \ → \\   (előbb, különben a 2. lépés kétértelmű lenne)
--     2) minden | → \|
--   Szám  : ROUND(x, 2)::text         → pl. '12345.00'
--   Dátum : to_char(x, 'YYYY-MM-DD')
--   UUID  : x::text                   → lowercase, kötőjelekkel
--   Szöveg: escape-lt (ld. fent)
--   Eseménytípusonkénti mezőlista: az audit_cash_entry / audit_cash_closing /
--   audit_cash_register trigger-függvényekben rögzített.
--
-- OWNER-ÁG BIZTONSÁGI MEGJEGYZÉS:
--   A SELECT/UPDATE/DELETE USING policy-kban maradó cash_has_access()
--   '_society_id = auth.uid()' ága azért ártalmatlan, mert a tárolt sorok
--   hunter_society_id értéke mindig egy tényleges vadásztársaság UUID-ja.
--   Ezt garantálja az INSERT WITH CHECK, ahol az owner-ág csak akkor nyílik
--   meg, ha get_user_hunter_society_id(auth.uid()) IS NULL — ami kizárólag
--   'hunter_society' user_type-ú profiloknál teljesül (az ő auth.uid()-juk
--   IS a hunter_society_id). Tag-felhasználóknál (hunter user_type, editor/
--   admin/viewer role) a get_user_hunter_society_id nem NULL, ezért soha
--   nem kerülhet be such sor, amelynek hunter_society_id egy editor UUID-ja.
--
-- FELTEVÉS (ellenőrizve a meglévő migrációkból, 2026-05-17):
--   get_user_hunter_society_id(_user_id) = profiles.hunter_society_id WHERE id=_user_id
--   hunter_society user_type-nál profiles.hunter_society_id mindig NULL
--   hunter user_type-nál profiles.hunter_society_id = a társaság UUID-ja
--   Forrás: 20251117163004 (ADD COLUMN) + 20251117164453 (függvény)
-- ============================================================

-- ============================================================
-- 1. pgcrypto (self-hosted Supabase-en alapból elérhető)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. cash_audit_log tábla
-- payload         : jsonb — lekérdezhetőséghez és megjelenítéshez
-- payload_canonical: text — kizárólag hash-számításhoz; escape-lt, stabil
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_audit_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seq               bigint      GENERATED ALWAYS AS IDENTITY,
  hunter_society_id uuid        NOT NULL,
  cash_register_id  uuid        REFERENCES public.cash_registers(id),
  event_type        text        NOT NULL,
  entity_type       text        NOT NULL,
  entity_id         uuid,
  document_number   text,
  actor_id          uuid        NOT NULL,
  actor_role        text,
  event_at          timestamptz NOT NULL DEFAULT now(),
  payload           jsonb       NOT NULL DEFAULT '{}',
  payload_canonical text        NOT NULL DEFAULT '',
  prev_hash         text        NOT NULL,
  entry_hash        text        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_audit_society_date
  ON public.cash_audit_log (hunter_society_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_audit_register_seq
  ON public.cash_audit_log (cash_register_id, seq);
CREATE INDEX IF NOT EXISTS idx_cash_audit_entity
  ON public.cash_audit_log (entity_type, entity_id);

-- ============================================================
-- 3. Append-only immutability trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_cash_audit_log_immutability()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Az audit napló bejegyzései nem módosíthatók és nem törölhetők.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_audit_immutability ON public.cash_audit_log;
CREATE TRIGGER trg_cash_audit_immutability
  BEFORE UPDATE OR DELETE ON public.cash_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_audit_log_immutability();

-- ============================================================
-- 4. Hash-lánc BEFORE INSERT trigger
-- seq KIZÁRVA a hash-ből (GENERATED ALWAYS AS IDENTITY értéke
-- BEFORE INSERT fázisban nem garantáltan végleges).
-- FOR UPDATE: sorosítja a konkurens inserteket ugyanazon pénztárra.
-- Explicit || konkatenáció, jsonb::text sehol a hash-inputban.
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_cash_audit_hash()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_prev text;
BEGIN
  SELECT entry_hash INTO v_prev
  FROM public.cash_audit_log
  WHERE cash_register_id = NEW.cash_register_id
  ORDER BY seq DESC
  LIMIT 1
  FOR UPDATE;

  v_prev := COALESCE(v_prev, 'GENESIS');
  NEW.prev_hash  := v_prev;
  NEW.entry_hash := encode(
    digest(
      COALESCE(NEW.entity_id::text, '')
      || '|'
      || to_char(NEW.event_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
      || '|'
      || NEW.event_type
      || '|'
      || COALESCE(NEW.payload_canonical, '')
      || '|'
      || v_prev,
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_audit_hash_chain ON public.cash_audit_log;
CREATE TRIGGER trg_cash_audit_hash_chain
  BEFORE INSERT ON public.cash_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.assign_cash_audit_hash();

-- ============================================================
-- 5. cash_has_access segédfüggvény (SELECT/UPDATE/DELETE USING-hoz)
-- INSERT WITH CHECK-hez NEM elegendő önmagában (ld. 9.2 komment).
-- ============================================================
CREATE OR REPLACE FUNCTION public.cash_has_access(_society_id uuid, _min_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _society_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      get_user_hunter_society_id(auth.uid()) = _society_id
      AND CASE _min_role
        WHEN 'viewer' THEN
          has_role(auth.uid(), 'viewer'::app_role)
          OR has_role(auth.uid(), 'editor'::app_role)
          OR has_role(auth.uid(), 'admin'::app_role)
        WHEN 'editor' THEN
          has_role(auth.uid(), 'editor'::app_role)
          OR has_role(auth.uid(), 'admin'::app_role)
        WHEN 'admin' THEN
          has_role(auth.uid(), 'admin'::app_role)
        ELSE false
      END
    )
$$;

-- ============================================================
-- 6. Escape-segédfüggvény a payload_canonical-hoz
-- Sorrend: előbb \ → \\, AZUTÁN | → \|  (fordítva kétértelmű lenne)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cash_escape_canonical(v text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(COALESCE(v, ''), '\', '\\'), '|', '\|')
$$;

-- ============================================================
-- 7. log_cash_event SECURITY DEFINER segédfüggvény
-- SECURITY DEFINER => megkerüli a cash_audit_log INSERT RLS-t
-- (a "Audit log no direct insert" policy az API-szintű inserteket
-- blokkolja; SECURITY DEFINER függvények postgres ownerként futnak).
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_cash_event(
  p_hunter_society_id  uuid,
  p_cash_register_id   uuid,
  p_event_type         text,
  p_entity_type        text,
  p_entity_id          uuid,
  p_document_number    text,
  p_payload            jsonb,
  p_payload_canonical  text
)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id   uuid;
  v_actor_role text;
BEGIN
  v_actor_id := auth.uid();

  SELECT role::text INTO v_actor_role
  FROM public.user_roles
  WHERE user_id = v_actor_id
  ORDER BY CASE role::text
    WHEN 'super_admin' THEN 1
    WHEN 'admin'       THEN 2
    WHEN 'editor'      THEN 3
    WHEN 'viewer'      THEN 4
    ELSE 5
  END
  LIMIT 1;

  IF v_actor_role IS NULL AND v_actor_id = p_hunter_society_id THEN
    v_actor_role := 'owner';
  END IF;

  -- prev_hash / entry_hash: a trg_cash_audit_hash_chain BEFORE INSERT trigger
  -- tölti ki; a 'PENDING' placeholder értékeket mindig felülírja.
  INSERT INTO public.cash_audit_log (
    hunter_society_id, cash_register_id, event_type, entity_type,
    entity_id, document_number, actor_id, actor_role, event_at,
    payload, payload_canonical,
    prev_hash, entry_hash
  ) VALUES (
    p_hunter_society_id, p_cash_register_id, p_event_type, p_entity_type,
    p_entity_id, p_document_number,
    COALESCE(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    v_actor_role, now(),
    COALESCE(p_payload, '{}'), COALESCE(p_payload_canonical, ''),
    'PENDING', 'PENDING'
  );
END;
$$;

-- ============================================================
-- 8a. cash_entries AFTER trigger
-- Trigger neve trg_cash_zzz_audit_entry: 'zzz' prefix garantálja,
-- hogy az összes többi AFTER trigger (pl. trg_cash_correction_status)
-- előbb fusson — az audit a végállapotot naplózza.
--
-- payload_canonical mezőlista (ABC sorrendben) eseménytípusonként:
--   bizonylat_letrehozva    : category, document_type, entry_date,
--                             entry_type, amount, partner_name
--   bizonylat_veglegesitett : amount, category, document_number,
--                             document_type, entry_type, event_date, partner_name
--   bizonylat_stornozva     : amount, corrected_amount, corrects_entry_id,
--                             correction_reason, document_number, document_type,
--                             entry_type, event_date, original_amount, partner_name
--   bizonylat_helyesbitett  : (ua. mint stornozva)
--   bizonylat_ellentelezve  : (ua. mint stornozva)
--   piszkozat_torolve       : amount, category, created_at, entry_type
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_cash_entry()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_event     text;
  v_payload   jsonb;
  v_canonical text;
BEGIN
  -- DELETE: csak piszkozat törölhető (immutability trigger védi a többit)
  IF TG_OP = 'DELETE' THEN
    v_canonical :=
      'amount='       || ROUND(OLD.amount, 2)::text
      || '|category=' || cash_escape_canonical(OLD.category)
      || '|created_at=' || to_char(OLD.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
      || '|entry_type=' || cash_escape_canonical(OLD.entry_type);
    PERFORM public.log_cash_event(
      OLD.hunter_society_id, OLD.cash_register_id,
      'piszkozat_torolve', 'cash_entry', OLD.id, OLD.document_number,
      jsonb_build_object('amount', OLD.amount, 'entry_type', OLD.entry_type,
                         'category', OLD.category, 'created_at', OLD.created_at),
      v_canonical
    );
    RETURN NULL;
  END IF;

  -- INSERT piszkozat: bizonylat_letrehozva
  IF TG_OP = 'INSERT' AND NEW.status = 'piszkozat' THEN
    v_canonical :=
      'amount='         || ROUND(NEW.amount, 2)::text
      || '|category='   || cash_escape_canonical(NEW.category)
      || '|document_type=' || cash_escape_canonical(NEW.document_type)
      || '|entry_date=' || COALESCE(to_char(NEW.entry_date, 'YYYY-MM-DD'), '')
      || '|entry_type=' || cash_escape_canonical(NEW.entry_type)
      || '|partner_name=' || cash_escape_canonical(NEW.partner_name);
    PERFORM public.log_cash_event(
      NEW.hunter_society_id, NEW.cash_register_id,
      'bizonylat_letrehozva', 'cash_entry', NEW.id, NULL,
      jsonb_build_object('document_type', NEW.document_type, 'amount', NEW.amount,
                         'entry_type', NEW.entry_type, 'entry_date', NEW.entry_date,
                         'category', NEW.category, 'partner_name', NEW.partner_name),
      v_canonical
    );
    RETURN NULL;
  END IF;

  -- INSERT vagy piszkozat->veglegesitett UPDATE
  IF NEW.status = 'veglegesitett'
     AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status = 'piszkozat'))
  THEN
    v_event := CASE NEW.document_type
      WHEN 'STO' THEN 'bizonylat_stornozva'
      WHEN 'HEL' THEN 'bizonylat_helyesbitett'
      WHEN 'ELL' THEN 'bizonylat_ellentelezve'
      ELSE             'bizonylat_veglegesitett'
    END;

    IF NEW.document_type IN ('STO', 'HEL', 'ELL') THEN
      v_canonical :=
        'amount='              || ROUND(NEW.amount, 2)::text
        || '|corrected_amount=' || COALESCE(ROUND(NEW.corrected_amount, 2)::text, '')
        || '|corrects_entry_id=' || COALESCE(NEW.corrects_entry_id::text, '')
        || '|correction_reason=' || cash_escape_canonical(NEW.correction_reason)
        || '|document_number='  || cash_escape_canonical(NEW.document_number)
        || '|document_type='    || cash_escape_canonical(NEW.document_type)
        || '|entry_type='       || cash_escape_canonical(NEW.entry_type)
        || '|event_date='       || COALESCE(to_char(NEW.event_date, 'YYYY-MM-DD'), '')
        || '|original_amount='  || COALESCE(ROUND(NEW.original_amount, 2)::text, '')
        || '|partner_name='     || cash_escape_canonical(NEW.partner_name);
      v_payload := jsonb_build_object(
        'document_type',    NEW.document_type,
        'document_number',  NEW.document_number,
        'amount',           NEW.amount,
        'entry_type',       NEW.entry_type,
        'event_date',       NEW.event_date,
        'category',         NEW.category,
        'partner_name',     NEW.partner_name,
        'corrects_entry_id',  NEW.corrects_entry_id,
        'correction_reason',  NEW.correction_reason,
        'original_amount',    NEW.original_amount,
        'corrected_amount',   NEW.corrected_amount
      );
    ELSE
      v_canonical :=
        'amount='           || ROUND(NEW.amount, 2)::text
        || '|category='     || cash_escape_canonical(NEW.category)
        || '|document_number=' || cash_escape_canonical(NEW.document_number)
        || '|document_type='   || cash_escape_canonical(NEW.document_type)
        || '|entry_type='      || cash_escape_canonical(NEW.entry_type)
        || '|event_date='      || COALESCE(to_char(NEW.event_date, 'YYYY-MM-DD'), '')
        || '|partner_name='    || cash_escape_canonical(NEW.partner_name);
      v_payload := jsonb_build_object(
        'document_type',   NEW.document_type,
        'document_number', NEW.document_number,
        'amount',          NEW.amount,
        'entry_type',      NEW.entry_type,
        'event_date',      NEW.event_date,
        'category',        NEW.category,
        'partner_name',    NEW.partner_name
      );
    END IF;

    PERFORM public.log_cash_event(
      NEW.hunter_society_id, NEW.cash_register_id,
      v_event, 'cash_entry', NEW.id, NEW.document_number,
      v_payload, v_canonical
    );
    RETURN NULL;
  END IF;

  -- Egyéb UPDATE-ek (pl. veglegesitett->stornozott a correction trigger által):
  -- a korrekciós bizonylat véglegesítése már naplózva van; itt nem naplózunk.
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_zzz_audit_entry ON public.cash_entries;
CREATE TRIGGER trg_cash_zzz_audit_entry
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_cash_entry();

-- ============================================================
-- 8b. cash_closings AFTER trigger
-- payload_canonical mezők ABC sorrendben:
--   penztar_zarva     : closing_balance, closing_number, difference,
--                       period_end, period_start
--   penztar_ujranyitva: closing_number, reopen_reason
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_cash_closing()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_canonical text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_canonical :=
      'closing_balance=' || ROUND(NEW.closing_balance, 2)::text
      || '|closing_number=' || cash_escape_canonical(NEW.closing_number)
      || '|difference='     || COALESCE(ROUND(NEW.difference, 2)::text, '')
      || '|period_end='     || to_char(NEW.period_end, 'YYYY-MM-DD')
      || '|period_start='   || to_char(NEW.period_start, 'YYYY-MM-DD');
    PERFORM public.log_cash_event(
      NEW.hunter_society_id, NEW.cash_register_id,
      'penztar_zarva', 'cash_closing', NEW.id, NEW.closing_number,
      jsonb_build_object('closing_number', NEW.closing_number,
                         'period_start',   NEW.period_start,
                         'period_end',     NEW.period_end,
                         'closing_balance',NEW.closing_balance,
                         'difference',     NEW.difference),
      v_canonical
    );
  ELSIF TG_OP = 'UPDATE'
        AND OLD.status = 'lezart'
        AND NEW.status = 'ujranyitott' THEN
    v_canonical :=
      'closing_number=' || cash_escape_canonical(NEW.closing_number)
      || '|reopen_reason=' || cash_escape_canonical(NEW.reopen_reason);
    PERFORM public.log_cash_event(
      NEW.hunter_society_id, NEW.cash_register_id,
      'penztar_ujranyitva', 'cash_closing', NEW.id, NEW.closing_number,
      jsonb_build_object('closing_number', NEW.closing_number,
                         'reopen_reason',  NEW.reopen_reason),
      v_canonical
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_audit_closing ON public.cash_closings;
CREATE TRIGGER trg_cash_audit_closing
  AFTER INSERT OR UPDATE ON public.cash_closings
  FOR EACH ROW EXECUTE FUNCTION public.audit_cash_closing();

-- ============================================================
-- 8c. cash_registers AFTER trigger
-- payload_canonical: currency, name, opening_balance (ABC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_cash_register()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_canonical text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_canonical :=
      'currency='        || cash_escape_canonical(NEW.currency)
      || '|name='        || cash_escape_canonical(NEW.name)
      || '|opening_balance=' || ROUND(NEW.opening_balance, 2)::text;
    PERFORM public.log_cash_event(
      NEW.hunter_society_id, NEW.id,
      'penztar_letrehozva', 'cash_register', NEW.id, NULL,
      jsonb_build_object('name',            NEW.name,
                         'opening_balance', NEW.opening_balance,
                         'currency',        NEW.currency),
      v_canonical
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_audit_register ON public.cash_registers;
CREATE TRIGGER trg_cash_audit_register
  AFTER INSERT ON public.cash_registers
  FOR EACH ROW EXECUTE FUNCTION public.audit_cash_register();

-- ============================================================
-- 9. RLS: cash_audit_log
-- SELECT : admin+ (viewer/editor NEM lát audit logot)
-- INSERT : false — csak SECURITY DEFINER log_cash_event() írhat
--          (az postgres ownerként fut, megkerüli az RLS-t)
-- UPDATE/DELETE: false + immutability trigger kettős védelem
-- ============================================================
ALTER TABLE public.cash_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit log readable by admin+" ON public.cash_audit_log;
CREATE POLICY "Audit log readable by admin+"
  ON public.cash_audit_log FOR SELECT
  USING (cash_has_access(hunter_society_id, 'admin'));

DROP POLICY IF EXISTS "Audit log no direct insert" ON public.cash_audit_log;
CREATE POLICY "Audit log no direct insert"
  ON public.cash_audit_log FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Audit log no update" ON public.cash_audit_log;
CREATE POLICY "Audit log no update"
  ON public.cash_audit_log FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Audit log no delete" ON public.cash_audit_log;
CREATE POLICY "Audit log no delete"
  ON public.cash_audit_log FOR DELETE
  USING (false);

-- ============================================================
-- 10. Meglévő cash_* RLS policy-k frissítése
-- ============================================================

-- 10.1 cash_registers
DROP POLICY IF EXISTS "Society manages own cash registers" ON public.cash_registers;

CREATE POLICY "Cash registers: viewer can select"
  ON public.cash_registers FOR SELECT
  USING (cash_has_access(hunter_society_id, 'viewer'));

CREATE POLICY "Cash registers: admin can insert"
  ON public.cash_registers FOR INSERT
  WITH CHECK (cash_has_access(hunter_society_id, 'admin'));

CREATE POLICY "Cash registers: admin can update"
  ON public.cash_registers FOR UPDATE
  USING (cash_has_access(hunter_society_id, 'admin'));

-- 10.2 cash_entries
-- INSERT WITH CHECK: cash_has_access() NEM elegendő, mert az owner-ág
-- (_society_id = auth.uid()) egy editor user UUID-jával is aktiválható
-- lenne. Fix: owner-ág csak akkor nyílik, ha get_user_hunter_society_id
-- IS NULL (hunter_society user_type esetén igaz, hunter/buyer esetén nem).
-- Az inlined logika így garantálja, hogy hunter_society_id = a beírandó
-- sorban pontosan az a társaság, amelyhez a felhasználó tartozik.
DROP POLICY IF EXISTS "Society views own cash entries"   ON public.cash_entries;
DROP POLICY IF EXISTS "Society creates own cash entries" ON public.cash_entries;
DROP POLICY IF EXISTS "Society updates own cash entries" ON public.cash_entries;
DROP POLICY IF EXISTS "Society deletes own cash entries" ON public.cash_entries;

CREATE POLICY "Cash entries: viewer can select"
  ON public.cash_entries FOR SELECT
  USING (cash_has_access(hunter_society_id, 'viewer'));

-- SELECT/UPDATE/DELETE USING-ban cash_has_access() owner-ága (_society_id =
-- auth.uid()) azért biztonságos, mert a tárolt sorok hunter_society_id-ja
-- mindig egy valódi hunter_society UUID — editor user UUID-ja sosem
-- kerülhet be, mivel az INSERT WITH CHECK alább ezt megakadályozza.

CREATE POLICY "Cash entries: editor creates BPB/KPB"
  ON public.cash_entries FOR INSERT
  WITH CHECK (
    document_type IN ('BPB', 'KPB')
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR (
        -- Társaság-tulajdonos: auth.uid() = hunter_society_id,
        -- ÉS get_user_hunter_society_id IS NULL (hunter_society user_type)
        hunter_society_id = auth.uid()
        AND get_user_hunter_society_id(auth.uid()) IS NULL
      )
      OR (
        -- Tag (editor/admin): pontosan a saját társaságára írhat
        get_user_hunter_society_id(auth.uid()) = hunter_society_id
        AND (has_role(auth.uid(), 'editor'::app_role)
             OR has_role(auth.uid(), 'admin'::app_role))
      )
    )
  );

CREATE POLICY "Cash entries: admin creates STO/HEL/ELL"
  ON public.cash_entries FOR INSERT
  WITH CHECK (
    document_type IN ('STO', 'HEL', 'ELL')
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR (
        hunter_society_id = auth.uid()
        AND get_user_hunter_society_id(auth.uid()) IS NULL
      )
      OR (
        get_user_hunter_society_id(auth.uid()) = hunter_society_id
        AND has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Cash entries: editor updates BPB/KPB"
  ON public.cash_entries FOR UPDATE
  USING (
    cash_has_access(hunter_society_id, 'editor')
    AND document_type IN ('BPB', 'KPB')
  );

CREATE POLICY "Cash entries: admin updates all"
  ON public.cash_entries FOR UPDATE
  USING (cash_has_access(hunter_society_id, 'admin'));

CREATE POLICY "Cash entries: editor deletes BPB/KPB"
  ON public.cash_entries FOR DELETE
  USING (
    cash_has_access(hunter_society_id, 'editor')
    AND document_type IN ('BPB', 'KPB')
  );

CREATE POLICY "Cash entries: admin deletes all"
  ON public.cash_entries FOR DELETE
  USING (cash_has_access(hunter_society_id, 'admin'));

-- 10.3 cash_closings
DROP POLICY IF EXISTS "Society manages own closings" ON public.cash_closings;

CREATE POLICY "Cash closings: viewer can select"
  ON public.cash_closings FOR SELECT
  USING (cash_has_access(hunter_society_id, 'viewer'));

CREATE POLICY "Cash closings: admin can insert"
  ON public.cash_closings FOR INSERT
  WITH CHECK (cash_has_access(hunter_society_id, 'admin'));

CREATE POLICY "Cash closings: admin can update"
  ON public.cash_closings FOR UPDATE
  USING (cash_has_access(hunter_society_id, 'admin'));

-- 10.4 cash_denominations
DROP POLICY IF EXISTS "Society manages own denominations" ON public.cash_denominations;

CREATE POLICY "Cash denominations: viewer can select"
  ON public.cash_denominations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cash_closings c
    WHERE c.id = closing_id
      AND cash_has_access(c.hunter_society_id, 'viewer')
  ));

CREATE POLICY "Cash denominations: admin can insert"
  ON public.cash_denominations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cash_closings c
    WHERE c.id = closing_id
      AND cash_has_access(c.hunter_society_id, 'admin')
  ));

CREATE POLICY "Cash denominations: admin can update"
  ON public.cash_denominations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.cash_closings c
    WHERE c.id = closing_id
      AND cash_has_access(c.hunter_society_id, 'admin')
  ));

-- 10.5 cash_policy
DROP POLICY IF EXISTS "Society manages own cash policy" ON public.cash_policy;

CREATE POLICY "Cash policy: viewer can select"
  ON public.cash_policy FOR SELECT
  USING (cash_has_access(hunter_society_id, 'viewer'));

CREATE POLICY "Cash policy: admin can manage"
  ON public.cash_policy FOR ALL
  USING (cash_has_access(hunter_society_id, 'admin'))
  WITH CHECK (cash_has_access(hunter_society_id, 'admin'));

-- 10.6 cash_categories
DROP POLICY IF EXISTS "Society manages own categories" ON public.cash_categories;

CREATE POLICY "Cash categories: viewer can select"
  ON public.cash_categories FOR SELECT
  USING (cash_has_access(hunter_society_id, 'viewer'));

CREATE POLICY "Cash categories: admin can manage"
  ON public.cash_categories FOR ALL
  USING (cash_has_access(hunter_society_id, 'admin'))
  WITH CHECK (cash_has_access(hunter_society_id, 'admin'));

-- 10.7 cash_sequences (csak SELECT policy létezett; INSERT/UPDATE
-- SECURITY DEFINER triggerekből megy, nem szükséges policy rá)
DROP POLICY IF EXISTS "Society reads own sequences" ON public.cash_sequences;

CREATE POLICY "Cash sequences: viewer can select"
  ON public.cash_sequences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cash_registers cr
    WHERE cr.id = cash_register_id
      AND cash_has_access(cr.hunter_society_id, 'viewer')
  ));

-- ============================================================
-- 11. cash_audit_chain_check view
-- Pénztárankénti lánc-integritás; admin UI "sértetlen ✓ / lánchiba ⚠" jelzőhöz.
-- chain_ok: az adott sor prev_hash-e = előző sor entry_hash-e.
-- Első sornál (nincs előző): chain_ok = (prev_hash = 'GENESIS').
-- ============================================================
CREATE OR REPLACE VIEW public.cash_audit_chain_check AS
SELECT
  id,
  seq,
  cash_register_id,
  hunter_society_id,
  event_type,
  event_at,
  actor_id,
  actor_role,
  document_number,
  prev_hash,
  entry_hash,
  LAG(entry_hash) OVER (PARTITION BY cash_register_id ORDER BY seq) AS computed_prev_hash,
  COALESCE(
    LAG(entry_hash) OVER (PARTITION BY cash_register_id ORDER BY seq) = prev_hash,
    prev_hash = 'GENESIS'
  ) AS chain_ok
FROM public.cash_audit_log;
