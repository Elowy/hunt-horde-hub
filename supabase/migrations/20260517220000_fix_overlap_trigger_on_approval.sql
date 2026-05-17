-- Fix: check_overlap_before_update nem futott státusz-változáskor (pending→approved),
-- ezért két pending regisztráció egymás után jóváhagyható volt ütközés-ellenőrzés nélkül.
-- A WHEN feltétel most az approval eseményre is kiterjed.
-- A check_hunting_overlap() függvény változatlan — ha overlap_count > 0, visszaállítja
-- status='pending' és requires_admin_approval=true értékeket, blokkolva a jóváhagyást.

DROP TRIGGER IF EXISTS check_overlap_before_update ON public.hunting_registrations;

CREATE TRIGGER check_overlap_before_update
  BEFORE UPDATE ON public.hunting_registrations
  FOR EACH ROW
  WHEN (
    (OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.end_time IS DISTINCT FROM NEW.end_time)
    OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved')
  )
  EXECUTE FUNCTION public.check_hunting_overlap();
