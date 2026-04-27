BEGIN;

-- Ensure required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create users table if missing, aligned with app queries
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'CASHIER',
  phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NULL
);

-- Basic validation checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_full_name_length'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_full_name_length CHECK (length(full_name) >= 2);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_organization_id_idx ON public.users(organization_id);

-- Foreign key to organizations if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    BEGIN
      ALTER TABLE public.users
        ADD CONSTRAINT users_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMIT;

