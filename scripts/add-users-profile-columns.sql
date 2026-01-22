-- =====================================================
-- ADD MISSING PROFILE COLUMNS TO public.users
-- =====================================================
-- This script adds profile-related columns to the public.users table
-- using IF NOT EXISTS to keep it idempotent and safe.
-- Columns: bio, location, avatar_url
-- =====================================================

-- Add bio column if missing
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio TEXT;
COMMENT ON COLUMN public.users.bio IS 'Biografía del usuario (hasta 500 caracteres)';

-- Add location column if missing
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS location TEXT;
COMMENT ON COLUMN public.users.location IS 'Ubicación del usuario (hasta 100 caracteres)';

-- Add avatar_url column if missing
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
COMMENT ON COLUMN public.users.avatar_url IS 'URL del avatar del usuario';

-- Optional: ensure phone exists for profile completeness
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT;
COMMENT ON COLUMN public.users.phone IS 'Número de teléfono del usuario';

-- Optional: ensure updated_at exists for tracking
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON COLUMN public.users.updated_at IS 'Fecha y hora de última actualización';

-- Optional: ensure created_at exists
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON COLUMN public.users.created_at IS 'Fecha y hora de creación del registro';

-- Verification: list columns in users
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY column_name;