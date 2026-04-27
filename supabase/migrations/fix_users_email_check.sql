DO $$
BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_format;
  ALTER TABLE public.users ADD CONSTRAINT users_email_format CHECK (
    position('@' in email) > 1 AND position('.' in email) > 3
  );
END $$;

