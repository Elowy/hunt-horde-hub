-- Hotfix: assign_cash_audit_hash — extensions.digest() séma-minősítés
--
-- Self-hosted Supabase-en a pgcrypto az 'extensions' sémában van (nem 'public').
-- A SET search_path='public'-os SECURITY DEFINER függvényben a minősítetlen
-- digest() hívás "function does not exist" hibát okoz.
-- Fix: digest() → extensions.digest() — hash-input formátum (v1.0 spec) VÁLTOZATLAN.

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
    extensions.digest(
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
