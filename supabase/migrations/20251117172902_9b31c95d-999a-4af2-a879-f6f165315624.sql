-- Remove the overly restrictive unique constraint
-- The frontend already handles checking for overlapping registrations
-- This constraint prevents creating multiple registrations for different time periods

DROP INDEX IF EXISTS public.unique_active_registration;