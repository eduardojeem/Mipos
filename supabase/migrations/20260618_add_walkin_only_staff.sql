-- MIGRATION: 20260618_add_walkin_only_staff
-- Agrega la opción de orden de llegada a los profesionales
BEGIN;

ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS walkin_only BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
