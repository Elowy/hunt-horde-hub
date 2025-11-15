-- Function to log activity for animals
CREATE OR REPLACE FUNCTION log_animal_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

  -- Insert activity log
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
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'animal_id', COALESCE(NEW.animal_id, OLD.animal_id),
      'species', COALESCE(NEW.species, OLD.species),
      'weight', COALESCE(NEW.weight, OLD.weight)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log activity for storage locations
CREATE OR REPLACE FUNCTION log_storage_location_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

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
    'storage_location',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'name', COALESCE(NEW.name, OLD.name),
      'address', COALESCE(NEW.address, OLD.address)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log activity for transport documents
CREATE OR REPLACE FUNCTION log_transport_document_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

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
    'transport_document',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'document_number', COALESCE(NEW.document_number, OLD.document_number),
      'animal_count', COALESCE(NEW.animal_count, OLD.animal_count),
      'total_weight', COALESCE(NEW.total_weight, OLD.total_weight)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log activity for announcements
CREATE OR REPLACE FUNCTION log_announcement_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

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
    'announcement',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'title', COALESCE(NEW.title, OLD.title)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log activity for hunting registrations
CREATE OR REPLACE FUNCTION log_hunting_registration_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

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
    'hunting_registration',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'status', COALESCE(NEW.status, OLD.status),
      'is_guest', COALESCE(NEW.is_guest, OLD.is_guest)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log activity for security zones
CREATE OR REPLACE FUNCTION log_security_zone_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

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
    'security_zone',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'name', COALESCE(NEW.name, OLD.name)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log activity for settlements
CREATE OR REPLACE FUNCTION log_settlement_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

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
    'settlement',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'name', COALESCE(NEW.name, OLD.name)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log activity for price settings
CREATE OR REPLACE FUNCTION log_price_setting_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

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
    'price_setting',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'species', COALESCE(NEW.species, OLD.species),
      'class', COALESCE(NEW.class, OLD.class),
      'price_per_kg', COALESCE(NEW.price_per_kg, OLD.price_per_kg)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log activity for transporters
CREATE OR REPLACE FUNCTION log_transporter_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  action_type TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

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
    'transporter',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'company_name', COALESCE(NEW.company_name, OLD.company_name)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for animals
CREATE TRIGGER log_animal_insert
  AFTER INSERT ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION log_animal_activity();

CREATE TRIGGER log_animal_update
  AFTER UPDATE ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION log_animal_activity();

CREATE TRIGGER log_animal_delete
  AFTER DELETE ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION log_animal_activity();

-- Create triggers for storage locations
CREATE TRIGGER log_storage_location_insert
  AFTER INSERT ON public.storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION log_storage_location_activity();

CREATE TRIGGER log_storage_location_update
  AFTER UPDATE ON public.storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION log_storage_location_activity();

CREATE TRIGGER log_storage_location_delete
  AFTER DELETE ON public.storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION log_storage_location_activity();

-- Create triggers for transport documents
CREATE TRIGGER log_transport_document_insert
  AFTER INSERT ON public.transport_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_transport_document_activity();

CREATE TRIGGER log_transport_document_update
  AFTER UPDATE ON public.transport_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_transport_document_activity();

CREATE TRIGGER log_transport_document_delete
  AFTER DELETE ON public.transport_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_transport_document_activity();

-- Create triggers for announcements
CREATE TRIGGER log_announcement_insert
  AFTER INSERT ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION log_announcement_activity();

CREATE TRIGGER log_announcement_update
  AFTER UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION log_announcement_activity();

CREATE TRIGGER log_announcement_delete
  AFTER DELETE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION log_announcement_activity();

-- Create triggers for hunting registrations
CREATE TRIGGER log_hunting_registration_insert
  AFTER INSERT ON public.hunting_registrations
  FOR EACH ROW
  EXECUTE FUNCTION log_hunting_registration_activity();

CREATE TRIGGER log_hunting_registration_update
  AFTER UPDATE ON public.hunting_registrations
  FOR EACH ROW
  EXECUTE FUNCTION log_hunting_registration_activity();

CREATE TRIGGER log_hunting_registration_delete
  AFTER DELETE ON public.hunting_registrations
  FOR EACH ROW
  EXECUTE FUNCTION log_hunting_registration_activity();

-- Create triggers for security zones
CREATE TRIGGER log_security_zone_insert
  AFTER INSERT ON public.security_zones
  FOR EACH ROW
  EXECUTE FUNCTION log_security_zone_activity();

CREATE TRIGGER log_security_zone_update
  AFTER UPDATE ON public.security_zones
  FOR EACH ROW
  EXECUTE FUNCTION log_security_zone_activity();

CREATE TRIGGER log_security_zone_delete
  AFTER DELETE ON public.security_zones
  FOR EACH ROW
  EXECUTE FUNCTION log_security_zone_activity();

-- Create triggers for settlements
CREATE TRIGGER log_settlement_insert
  AFTER INSERT ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION log_settlement_activity();

CREATE TRIGGER log_settlement_update
  AFTER UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION log_settlement_activity();

CREATE TRIGGER log_settlement_delete
  AFTER DELETE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION log_settlement_activity();

-- Create triggers for price settings
CREATE TRIGGER log_price_setting_insert
  AFTER INSERT ON public.price_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_price_setting_activity();

CREATE TRIGGER log_price_setting_update
  AFTER UPDATE ON public.price_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_price_setting_activity();

CREATE TRIGGER log_price_setting_delete
  AFTER DELETE ON public.price_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_price_setting_activity();

-- Create triggers for transporters
CREATE TRIGGER log_transporter_insert
  AFTER INSERT ON public.transporters
  FOR EACH ROW
  EXECUTE FUNCTION log_transporter_activity();

CREATE TRIGGER log_transporter_update
  AFTER UPDATE ON public.transporters
  FOR EACH ROW
  EXECUTE FUNCTION log_transporter_activity();

CREATE TRIGGER log_transporter_delete
  AFTER DELETE ON public.transporters
  FOR EACH ROW
  EXECUTE FUNCTION log_transporter_activity();