BEGIN;

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Allow SUPER_ADMIN to select all roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'roles_select_super_admin'
  ) THEN
    CREATE POLICY roles_select_super_admin
      ON public.roles
      FOR SELECT
      USING (is_super_admin());
  END IF;
END $$;

-- Allow regular users to select global roles or roles of their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'roles_select_by_membership'
  ) THEN
    CREATE POLICY roles_select_by_membership
      ON public.roles
      FOR SELECT
      USING (
        organization_id IS NULL OR EXISTS (
          SELECT 1 FROM public.organization_members m
          WHERE m.user_id = auth.uid() AND m.organization_id = public.roles.organization_id
        )
      );
  END IF;
END $$;

COMMIT;

