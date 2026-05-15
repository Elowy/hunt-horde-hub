-- Status enum
DO $$ BEGIN
  CREATE TYPE animal_status AS ENUM (
    'elerheto',
    'foglalva',
    'szamlazva',
    'elszallitva',
    'archivalva'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS status animal_status NOT NULL DEFAULT 'elerheto';

CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);

COMMENT ON COLUMN public.animals.status IS 'Állat életciklus státusza. elerheto → foglalva → szamlazva → elszallitva → archivalva';

-- Backfill foglalt
UPDATE public.animals
SET status = 'foglalva'
WHERE status = 'elerheto' AND reserved_by IS NOT NULL;

-- Backfill számlázott
UPDATE public.animals
SET status = 'szamlazva'
WHERE id IN (SELECT animal_id FROM public.invoice_animals)
  AND status = 'elerheto';

-- Backfill elszállított
UPDATE public.animals
SET status = 'elszallitva'
WHERE is_transported = true
  AND status IN ('elerheto', 'foglalva', 'szamlazva');

-- Backfill archivált
UPDATE public.animals
SET status = 'archivalva'
WHERE archived = true
  AND status <> 'archivalva';

-- Trigger: invoice_animals INSERT → szamlazva
CREATE OR REPLACE FUNCTION public.set_animal_status_on_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.animals
  SET status = 'szamlazva'
  WHERE id = NEW.animal_id
    AND status IN ('elerheto', 'foglalva');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS animal_status_on_invoice ON public.invoice_animals;
CREATE TRIGGER animal_status_on_invoice
  AFTER INSERT ON public.invoice_animals
  FOR EACH ROW EXECUTE FUNCTION public.set_animal_status_on_invoice();

-- Trigger: reserved_by → státusz szinkron
CREATE OR REPLACE FUNCTION public.sync_animal_status_with_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reserved_by IS NOT NULL AND OLD.reserved_by IS NULL THEN
    IF NEW.status = 'elerheto' THEN
      NEW.status := 'foglalva';
    END IF;
  END IF;

  IF NEW.reserved_by IS NULL AND OLD.reserved_by IS NOT NULL THEN
    IF NEW.status = 'foglalva' THEN
      NEW.status := 'elerheto';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_animal_status_reservation ON public.animals;
CREATE TRIGGER sync_animal_status_reservation
  BEFORE UPDATE OF reserved_by ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.sync_animal_status_with_reservation();