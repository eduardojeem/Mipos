-- Ensure users.id has a unique index to satisfy FK requirements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'users_id_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX users_id_unique_idx ON public.users(id);
  END IF;
END $$;