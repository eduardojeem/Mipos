BEGIN;

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow SUPER_ADMIN to select all sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'user_sessions_select_super_admin'
  ) THEN
    CREATE POLICY user_sessions_select_super_admin
      ON public.user_sessions
      FOR SELECT
      USING (public.is_super_admin());
  END IF;
END $$;

-- Allow users to select their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'user_sessions_select_self'
  ) THEN
    CREATE POLICY user_sessions_select_self
      ON public.user_sessions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow members to select sessions of users in their organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'user_sessions_select_by_membership'
  ) THEN
    CREATE POLICY user_sessions_select_by_membership
      ON public.user_sessions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = public.user_sessions.user_id
            AND u.organization_id = ANY(public.get_user_org_ids())
        )
      );
  END IF;
END $$;

COMMIT;

