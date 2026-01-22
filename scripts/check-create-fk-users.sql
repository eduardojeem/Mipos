-- Prueba crear una tabla simple con FK a public.users(id)
DROP TABLE IF EXISTS public.user_ref_test CASCADE;
CREATE TABLE public.user_ref_test (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);