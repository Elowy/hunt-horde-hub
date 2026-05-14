CREATE TABLE IF NOT EXISTS public.invoice_animals (
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  animal_id uuid NOT NULL REFERENCES public.animals(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invoice_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_animals_animal ON public.invoice_animals(animal_id);

ALTER TABLE public.invoice_animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hunter societies see their invoice animals"
  ON public.invoice_animals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND (i.hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Hunter societies create their invoice animals"
  ON public.invoice_animals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND (i.hunter_society_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );