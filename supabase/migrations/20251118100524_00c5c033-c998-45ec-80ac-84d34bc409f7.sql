-- Create function to add existing hunter to a society
CREATE OR REPLACE FUNCTION public.add_hunter_to_society(
  _hunter_user_id UUID,
  _society_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID;
  _caller_is_admin BOOLEAN;
  _target_is_hunter BOOLEAN;
  _target_current_society UUID;
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
  
  -- Get target user's current society
  SELECT hunter_society_id INTO _target_current_society
  FROM public.profiles
  WHERE id = _hunter_user_id;
  
  -- Check if already in a society
  IF _target_current_society IS NOT NULL THEN
    RAISE EXCEPTION 'A vadász már tartozik egy vadásztársasághoz';
  END IF;
  
  -- Update the hunter's society
  UPDATE public.profiles
  SET 
    hunter_society_id = _society_id,
    updated_at = NOW()
  WHERE id = _hunter_user_id;
  
END;
$$;