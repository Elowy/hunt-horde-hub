-- 1. Animals: epidemic_measure_id
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS epidemic_measure_id uuid REFERENCES public.epidemic_measures(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.animals.epidemic_measure_id IS 'Ha usage_type = kartalanitas, ez a járványügyi intézkedés amiből az ár származik';

-- 2. society_species_quotas
CREATE TABLE IF NOT EXISTS public.society_species_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_society_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species text NOT NULL,
  max_count integer NOT NULL CHECK (max_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hunter_society_id, species)
);

CREATE INDEX IF NOT EXISTS idx_society_quotas_society ON public.society_species_quotas(hunter_society_id);

ALTER TABLE public.society_species_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society admins manage their quotas"
  ON public.society_species_quotas FOR ALL
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Hunters view their society quotas"
  ON public.society_species_quotas FOR SELECT
  USING (
    hunter_society_id = get_user_hunter_society_id(auth.uid())
    OR hunter_society_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER update_society_species_quotas_updated_at
  BEFORE UPDATE ON public.society_species_quotas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. hunter_meat_quotas
CREATE TABLE IF NOT EXISTS public.hunter_meat_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hunter_society_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species text NOT NULL,
  max_kg numeric(10,2) NOT NULL CHECK (max_kg >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hunter_id, hunter_society_id, species)
);

CREATE INDEX IF NOT EXISTS idx_hunter_quotas_hunter ON public.hunter_meat_quotas(hunter_id);
CREATE INDEX IF NOT EXISTS idx_hunter_quotas_society ON public.hunter_meat_quotas(hunter_society_id);

ALTER TABLE public.hunter_meat_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Society admins manage hunter quotas"
  ON public.hunter_meat_quotas FOR ALL
  USING (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (hunter_society_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Hunters view their own quotas"
  ON public.hunter_meat_quotas FOR SELECT
  USING (
    hunter_id = auth.uid()
    OR hunter_society_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER update_hunter_meat_quotas_updated_at
  BEFORE UPDATE ON public.hunter_meat_quotas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();