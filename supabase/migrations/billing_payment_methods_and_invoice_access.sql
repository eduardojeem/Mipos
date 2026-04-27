CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'mock',
  brand text,
  last4 text,
  exp_month int,
  exp_year int,
  is_default boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_org_default ON public.payment_methods(organization_id, is_default);

ALTER TABLE IF EXISTS public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_methods' AND policyname = 'Members read payment_methods'
  ) THEN
    EXECUTE '
      CREATE POLICY "Members read payment_methods" ON public.payment_methods
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_id = payment_methods.organization_id
          )
        )
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_methods' AND policyname = 'Owner/superadmin write payment_methods'
  ) THEN
    EXECUTE '
      CREATE POLICY "Owner/superadmin write payment_methods" ON public.payment_methods
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.organization_members om
            LEFT JOIN public.roles r ON r.id = om.role_id
            WHERE om.user_id = auth.uid()
              AND om.organization_id = payment_methods.organization_id
              AND (om.is_owner = true OR r.name = ''SUPER_ADMIN'')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.organization_members om
            LEFT JOIN public.roles r ON r.id = om.role_id
            WHERE om.user_id = auth.uid()
              AND om.organization_id = payment_methods.organization_id
              AND (om.is_owner = true OR r.name = ''SUPER_ADMIN'')
          )
        )
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Members read invoices'
  ) THEN
    EXECUTE '
      CREATE POLICY "Members read invoices" ON public.invoices
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_id = invoices.organization_id
          )
        )
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'Members read payments'
  ) THEN
    EXECUTE '
      CREATE POLICY "Members read payments" ON public.payments
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_id = payments.organization_id
          )
        )
    ';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO service_role;
