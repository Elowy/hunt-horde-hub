ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS transporter TEXT;

COMMENT ON COLUMN public.animals.transporter IS 'Az állatot elszállító személy/cég neve. Manuálisan vagy számlakiállításnál automatikusan töltődik.';

CREATE OR REPLACE FUNCTION public.set_animal_transporter_on_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  invoice_buyer text;
BEGIN
  SELECT buyer_name INTO invoice_buyer
  FROM public.invoices
  WHERE id = NEW.invoice_id
  LIMIT 1;

  IF invoice_buyer IS NOT NULL AND invoice_buyer <> '' THEN
    UPDATE public.animals
    SET transporter = invoice_buyer
    WHERE id = NEW.animal_id
      AND (transporter IS NULL OR transporter = '');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS animal_transporter_on_invoice ON public.invoice_animals;
CREATE TRIGGER animal_transporter_on_invoice
  AFTER INSERT ON public.invoice_animals
  FOR EACH ROW EXECUTE FUNCTION public.set_animal_transporter_on_invoice();

UPDATE public.animals a
SET transporter = i.buyer_name
FROM public.invoice_animals ia
JOIN public.invoices i ON i.id = ia.invoice_id
WHERE ia.animal_id = a.id
  AND (a.transporter IS NULL OR a.transporter = '')
  AND i.buyer_name IS NOT NULL AND i.buyer_name <> '';