ALTER TABLE public.hunter_feature_permissions
  ADD COLUMN IF NOT EXISTS allow_view_cooled_animals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_reserve_animals boolean NOT NULL DEFAULT true;