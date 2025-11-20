-- Delete all data from tables (but keep the schema)
-- Order matters due to foreign key constraints

-- First delete from tables that reference other tables
DELETE FROM public.transport_document_items;
DELETE FROM public.transport_documents;
DELETE FROM public.buyer_price_proposals;
DELETE FROM public.purchase_offers;
DELETE FROM public.transporter_prices;
DELETE FROM public.transporters;
DELETE FROM public.buyers;
DELETE FROM public.cooling_prices;
DELETE FROM public.price_settings;
DELETE FROM public.security_zone_closures;
DELETE FROM public.hunting_locations;
DELETE FROM public.hunting_registrations;
DELETE FROM public.map_pois;
DELETE FROM public.map_zones;
DELETE FROM public.epidemic_measures;
DELETE FROM public.hired_hunters;
DELETE FROM public.animals;
DELETE FROM public.pending_animals;
DELETE FROM public.qr_codes;
DELETE FROM public.storage_locations;
DELETE FROM public.security_zones;
DELETE FROM public.settlements;
DELETE FROM public.announcements;
DELETE FROM public.hunter_feature_permissions;
DELETE FROM public.hunter_society_members;
DELETE FROM public.membership_fee_settings;
DELETE FROM public.membership_payments;
DELETE FROM public.notification_settings;
DELETE FROM public.notifications;
DELETE FROM public.notification_logs;
DELETE FROM public.ticket_comments;
DELETE FROM public.tickets;
DELETE FROM public.invitations;
DELETE FROM public.activity_logs;
DELETE FROM public.quick_actions_settings;
DELETE FROM public.subscription_codes;
DELETE FROM public.trial_subscriptions;
DELETE FROM public.lifetime_subscriptions;
DELETE FROM public.user_login_history;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Now modify the handle_new_user function to give super_admin role to lollipopp23@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  is_hunter boolean;
  hunter_society_uuid uuid;
BEGIN
  -- Check if user type is hunter
  is_hunter := (new.raw_user_meta_data ->> 'user_type') = 'hunter';
  
  -- Parse hunter_society_id to UUID if it exists and is not empty
  hunter_society_uuid := NULL;
  IF (new.raw_user_meta_data ->> 'hunter_society_id') IS NOT NULL 
     AND (new.raw_user_meta_data ->> 'hunter_society_id') != '' THEN
    BEGIN
      hunter_society_uuid := (new.raw_user_meta_data ->> 'hunter_society_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      hunter_society_uuid := NULL;
    END;
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (
    id, 
    company_name, 
    contact_name, 
    contact_email, 
    contact_phone, 
    address,
    tax_number,
    user_type,
    hunter_license_number,
    birth_date,
    privacy_policy_accepted,
    privacy_policy_accepted_at,
    hunter_category,
    registration_approved
  )
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'contact_name',
    new.raw_user_meta_data ->> 'contact_email',
    new.raw_user_meta_data ->> 'contact_phone',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'tax_number',
    new.raw_user_meta_data ->> 'user_type',
    new.raw_user_meta_data ->> 'hunter_license_number',
    CASE 
      WHEN new.raw_user_meta_data ->> 'birth_date' IS NOT NULL 
      THEN (new.raw_user_meta_data ->> 'birth_date')::date 
      ELSE NULL 
    END,
    CASE 
      WHEN new.raw_user_meta_data ->> 'privacy_policy_accepted' = 'true' 
      THEN true 
      ELSE false 
    END,
    CASE 
      WHEN new.raw_user_meta_data ->> 'privacy_policy_accepted' = 'true' 
      THEN now() 
      ELSE NULL 
    END,
    CASE 
      WHEN is_hunter THEN 'tag'::hunter_category
      ELSE NULL
    END,
    NOT is_hunter
  );
  
  -- If hunter and hunter_society_id provided, add to hunter_society_members table
  IF is_hunter AND hunter_society_uuid IS NOT NULL THEN
    INSERT INTO public.hunter_society_members (hunter_id, hunter_society_id)
    VALUES (new.id, hunter_society_uuid)
    ON CONFLICT (hunter_id, hunter_society_id) DO NOTHING;
  END IF;
  
  -- Give super_admin role to lollipopp23@gmail.com
  IF lower(new.email) = 'lollipopp23@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'super_admin');
  END IF;
  
  RETURN new;
END;
$function$;