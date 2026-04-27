BEGIN;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow SUPER_ADMIN to select all users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_super_admin'
  ) THEN
    CREATE POLICY users_select_super_admin
      ON public.users
      FOR SELECT
      USING (is_super_admin());
  END IF;
END $$;

-- Allow members to select users within their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_by_membership'
  ) THEN
    CREATE POLICY users_select_by_membership
      ON public.users
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.user_id = auth.uid() AND m.organization_id = public.users.organization_id
        )
      );
  END IF;
END $$;

COMMIT;

