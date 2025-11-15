-- Create quick_actions_settings table for storing user's customizable quick action buttons
CREATE TABLE IF NOT EXISTS public.quick_actions_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_1 text NOT NULL DEFAULT 'add_animal',
  action_2 text NOT NULL DEFAULT 'hunting_registration',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.quick_actions_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own quick actions settings"
  ON public.quick_actions_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quick actions settings"
  ON public.quick_actions_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quick actions settings"
  ON public.quick_actions_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_quick_actions_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quick_actions_settings_updated_at
  BEFORE UPDATE ON public.quick_actions_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quick_actions_settings_updated_at();