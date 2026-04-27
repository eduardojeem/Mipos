-- Fix infinite recursion in RLS policy for public.promotions (UPDATE)

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promotions'
      AND policyname = 'promotions_update_authenticated'
  ) THEN
    EXECUTE 'DROP POLICY promotions_update_authenticated ON public.promotions';
  END IF;
END $$;

CREATE POLICY promotions_update_authenticated ON public.promotions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = public.promotions.organization_id
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = public.promotions.organization_id
      )
    )
  );

NOTIFY pgrst, 'reload schema';
