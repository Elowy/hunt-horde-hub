-- Hotfix: cash_entries.created_by auto-fill auth.uid()-ból ha a frontend NULL-t küld.
-- Konzisztens az M1/M2 issued_by és recorded_at automatikus kitöltésével.
--
-- Trigger neve: trg_cash_a_set_created_by
-- Az 'a_' prefix garantálja az ABC-első futást a többi BEFORE INSERT trigger előtt:
--   trg_cash_a_set_created_by  ← ez fut elsőként ('a_' < 'aa_' < 'cl' < 'no' < 'va' < 'zz')
--   trg_cash_aa_correction
--   trg_cash_closed_period
--   trg_cash_nonneg
--   trg_cash_validate
--   trg_cash_zz_assign_number
-- A validációs és audit triggerek tehát már kitöltve kapják a created_by-t.
--
-- NOT SECURITY DEFINER: auth.uid() a hívó session JWT-kontextusából olvas
-- (request.jwt.claims — PostgREST állítja be). SECURITY DEFINER-rel is elérhető
-- lenne, de nem szükséges, és a hívó kontextus az elvárt viselkedés.
--
-- Az automatikus triggerek (cash_entry_from_invoice, cash_entry_from_membership)
-- explicit created_by értéket adnak át, tehát náluk a feltétel (IS NULL) nem teljesül.

CREATE OR REPLACE FUNCTION public.set_cash_entry_created_by()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_a_set_created_by ON public.cash_entries;
CREATE TRIGGER trg_cash_a_set_created_by
  BEFORE INSERT ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_cash_entry_created_by();
