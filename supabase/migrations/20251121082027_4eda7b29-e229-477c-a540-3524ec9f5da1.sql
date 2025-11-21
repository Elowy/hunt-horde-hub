-- Fix log_animal_activity function to remove non-existent condition field
CREATE OR REPLACE FUNCTION public.log_animal_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
  action_type TEXT;
  changes JSONB := '{}'::jsonb;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
    -- For insert, store all new values
    changes := jsonb_build_object('new', row_to_json(NEW)::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
    -- For update, track individual field changes
    IF OLD.animal_id IS DISTINCT FROM NEW.animal_id THEN
      changes := changes || jsonb_build_object('animal_id', jsonb_build_object('old', OLD.animal_id, 'new', NEW.animal_id));
    END IF;
    IF OLD.species IS DISTINCT FROM NEW.species THEN
      changes := changes || jsonb_build_object('species', jsonb_build_object('old', OLD.species, 'new', NEW.species));
    END IF;
    IF OLD.gender IS DISTINCT FROM NEW.gender THEN
      changes := changes || jsonb_build_object('gender', jsonb_build_object('old', OLD.gender, 'new', NEW.gender));
    END IF;
    IF OLD.weight IS DISTINCT FROM NEW.weight THEN
      changes := changes || jsonb_build_object('weight', jsonb_build_object('old', OLD.weight, 'new', NEW.weight));
    END IF;
    IF OLD.class IS DISTINCT FROM NEW.class THEN
      changes := changes || jsonb_build_object('class', jsonb_build_object('old', OLD.class, 'new', NEW.class));
    END IF;
    IF OLD.age IS DISTINCT FROM NEW.age THEN
      changes := changes || jsonb_build_object('age', jsonb_build_object('old', OLD.age, 'new', NEW.age));
    END IF;
    IF OLD.hunter_name IS DISTINCT FROM NEW.hunter_name THEN
      changes := changes || jsonb_build_object('hunter_name', jsonb_build_object('old', OLD.hunter_name, 'new', NEW.hunter_name));
    END IF;
    IF OLD.hunter_type IS DISTINCT FROM NEW.hunter_type THEN
      changes := changes || jsonb_build_object('hunter_type', jsonb_build_object('old', OLD.hunter_type, 'new', NEW.hunter_type));
    END IF;
    IF OLD.storage_location_id IS DISTINCT FROM NEW.storage_location_id THEN
      changes := changes || jsonb_build_object('storage_location_id', jsonb_build_object('old', OLD.storage_location_id, 'new', NEW.storage_location_id));
    END IF;
    IF OLD.security_zone_id IS DISTINCT FROM NEW.security_zone_id THEN
      changes := changes || jsonb_build_object('security_zone_id', jsonb_build_object('old', OLD.security_zone_id, 'new', NEW.security_zone_id));
    END IF;
    IF OLD.is_transported IS DISTINCT FROM NEW.is_transported THEN
      changes := changes || jsonb_build_object('is_transported', jsonb_build_object('old', OLD.is_transported, 'new', NEW.is_transported));
    END IF;
    IF OLD.transported_at IS DISTINCT FROM NEW.transported_at THEN
      changes := changes || jsonb_build_object('transported_at', jsonb_build_object('old', OLD.transported_at, 'new', NEW.transported_at));
    END IF;
    IF OLD.vet_check IS DISTINCT FROM NEW.vet_check THEN
      changes := changes || jsonb_build_object('vet_check', jsonb_build_object('old', OLD.vet_check, 'new', OLD.vet_check));
    END IF;
    IF OLD.vet_result IS DISTINCT FROM NEW.vet_result THEN
      changes := changes || jsonb_build_object('vet_result', jsonb_build_object('old', OLD.vet_result, 'new', NEW.vet_result));
    END IF;
    IF OLD.vet_doctor_name IS DISTINCT FROM NEW.vet_doctor_name THEN
      changes := changes || jsonb_build_object('vet_doctor_name', jsonb_build_object('old', OLD.vet_doctor_name, 'new', NEW.vet_doctor_name));
    END IF;
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      changes := changes || jsonb_build_object('notes', jsonb_build_object('old', OLD.notes, 'new', NEW.notes));
    END IF;
    IF OLD.transport_price_per_kg IS DISTINCT FROM NEW.transport_price_per_kg THEN
      changes := changes || jsonb_build_object('transport_price_per_kg', jsonb_build_object('old', OLD.transport_price_per_kg, 'new', NEW.transport_price_per_kg));
    END IF;
    IF OLD.transport_vat_rate IS DISTINCT FROM NEW.transport_vat_rate THEN
      changes := changes || jsonb_build_object('transport_vat_rate', jsonb_build_object('old', OLD.transport_vat_rate, 'new', NEW.transport_vat_rate));
    END IF;
    IF OLD.transport_cooling_price IS DISTINCT FROM NEW.transport_cooling_price THEN
      changes := changes || jsonb_build_object('transport_cooling_price', jsonb_build_object('old', OLD.transport_cooling_price, 'new', NEW.transport_cooling_price));
    END IF;
    IF OLD.transport_cooling_vat_rate IS DISTINCT FROM NEW.transport_cooling_vat_rate THEN
      changes := changes || jsonb_build_object('transport_cooling_vat_rate', jsonb_build_object('old', OLD.transport_cooling_vat_rate, 'new', NEW.transport_cooling_vat_rate));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
    -- For delete, store all old values
    changes := jsonb_build_object('old', row_to_json(OLD)::jsonb);
  END IF;

  -- Insert activity log with detailed changes
  INSERT INTO public.activity_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    user_email,
    action_type,
    'animal',
    COALESCE(NEW.id, OLD.id),
    changes
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;