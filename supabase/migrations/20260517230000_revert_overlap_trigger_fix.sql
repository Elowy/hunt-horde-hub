-- Revert: 20260517220000 fix visszaállítása.
-- Az üzleti logika: korlátlan vadász lehet egyszerre egy körzetben; az overlap trigger
-- csak admin-jóváhagyás-kötelezővé teszi az átfedő beiratkozást, nem tiltja.
-- A korábbi fix (approval-kor is futtatni) végtelen pending-ciklust okozott:
-- az admin soha nem tudta jóváhagyni az átfedő beiratkozást.
-- A check_overlap_before_update trigger visszaáll az eredeti WHEN feltételre:
-- csak akkor fut, ha az időpontok változnak.

DROP TRIGGER IF EXISTS check_overlap_before_update ON public.hunting_registrations;

CREATE TRIGGER check_overlap_before_update
  BEFORE UPDATE ON public.hunting_registrations
  FOR EACH ROW
  WHEN (OLD.start_time IS DISTINCT FROM NEW.start_time
        OR OLD.end_time IS DISTINCT FROM NEW.end_time)
  EXECUTE FUNCTION public.check_hunting_overlap();
