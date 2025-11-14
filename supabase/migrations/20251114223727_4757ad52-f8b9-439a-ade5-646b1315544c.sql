-- Bővítjük az app_role enum-ot a 'hunter' szerepkörrel
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hunter';