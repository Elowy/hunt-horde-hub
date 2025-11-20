-- Create hunter_society_members junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.hunter_society_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hunter_society_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(hunter_id, hunter_society_id)
);

-- Enable RLS
ALTER TABLE public.hunter_society_members ENABLE ROW LEVEL SECURITY;

-- Policies for hunter_society_members
CREATE POLICY "Hunters can view their own memberships"
ON public.hunter_society_members
FOR SELECT
USING (auth.uid() = hunter_id);

CREATE POLICY "Hunter society admins can view their members"
ON public.hunter_society_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND id = hunter_society_id
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Hunter society admins can add members"
ON public.hunter_society_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND id = hunter_society_id
  ) AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Hunter society admins can remove members"
ON public.hunter_society_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND id = hunter_society_id
  ) AND has_role(auth.uid(), 'admin'::app_role)
);

-- Migrate existing hunter_society_id data to the new table
INSERT INTO public.hunter_society_members (hunter_id, hunter_society_id)
SELECT id, hunter_society_id
FROM public.profiles
WHERE hunter_society_id IS NOT NULL
ON CONFLICT (hunter_id, hunter_society_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hunter_society_members_hunter_id ON public.hunter_society_members(hunter_id);
CREATE INDEX IF NOT EXISTS idx_hunter_society_members_society_id ON public.hunter_society_members(hunter_society_id);

-- Add activity log trigger
CREATE OR REPLACE FUNCTION public.log_hunter_society_member_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.hunter_id, OLD.hunter_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'add_member';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'remove_member';
  END IF;

  INSERT INTO public.activity_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    COALESCE(NEW.hunter_id, OLD.hunter_id),
    user_email,
    action_type,
    'hunter_society_member',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'hunter_society_id', COALESCE(NEW.hunter_society_id, OLD.hunter_society_id)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_hunter_society_member_changes
AFTER INSERT OR DELETE ON public.hunter_society_members
FOR EACH ROW
EXECUTE FUNCTION public.log_hunter_society_member_activity();