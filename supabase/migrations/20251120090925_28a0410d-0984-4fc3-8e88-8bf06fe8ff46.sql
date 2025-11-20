-- Update add_hunter_to_society function to use hunter_society_members table
CREATE OR REPLACE FUNCTION public.add_hunter_to_society(_hunter_user_id uuid, _society_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID;
  _caller_is_admin BOOLEAN;
  _target_is_hunter BOOLEAN;
BEGIN
  -- Get caller ID
  _caller_id := auth.uid();
  
  -- Check if caller is admin
  _caller_is_admin := has_role(_caller_id, 'admin'::app_role);
  
  IF NOT _caller_is_admin THEN
    RAISE EXCEPTION 'Csak adminisztrátorok adhatnak hozzá vadászokat a társasághoz';
  END IF;
  
  -- Check if caller's profile matches the society
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _caller_id AND id = _society_id
  ) THEN
    RAISE EXCEPTION 'Csak a saját vadásztársaságodhoz adhatsz hozzá vadászokat';
  END IF;
  
  -- Check if target user is a hunter
  _target_is_hunter := has_role(_hunter_user_id, 'hunter'::app_role);
  
  IF NOT _target_is_hunter THEN
    RAISE EXCEPTION 'Csak vadász szerepkörű felhasználókat lehet hozzáadni';
  END IF;
  
  -- Add hunter to society using hunter_society_members table
  INSERT INTO public.hunter_society_members (hunter_id, hunter_society_id)
  VALUES (_hunter_user_id, _society_id)
  ON CONFLICT (hunter_id, hunter_society_id) DO NOTHING;
  
END;
$$;