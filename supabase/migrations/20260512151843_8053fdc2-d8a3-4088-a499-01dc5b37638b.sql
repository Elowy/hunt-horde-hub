-- Profiles bővítés
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS szamlazz_agent_key TEXT,
  ADD COLUMN IF NOT EXISTS szamlazz_invoice_prefix TEXT DEFAULT 'VG',
  ADD COLUMN IF NOT EXISTS szamlazz_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.szamlazz_agent_key IS 'Hunter society egyedi Számlázz.hu Számla Agent kulcsa. Csak hunter_society user_type esetén használt. Titkosítatlan a táblában — RLS védi.';

-- Invoices tábla
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_society_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  source_type TEXT NOT NULL,
  source_id uuid,
  szamlazz_invoice_number TEXT,
  szamlazz_url TEXT,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_tax_number TEXT,
  buyer_address TEXT,
  net_amount NUMERIC(12,2),
  vat_amount NUMERIC(12,2),
  gross_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'HUF',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_hunter_society ON public.invoices(hunter_society_id);
CREATE INDEX IF NOT EXISTS idx_invoices_source ON public.invoices(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hunter societies see their own invoices"
  ON public.invoices FOR SELECT
  USING (hunter_society_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Hunter societies create their own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (hunter_society_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Society reads own invoice PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoices'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );