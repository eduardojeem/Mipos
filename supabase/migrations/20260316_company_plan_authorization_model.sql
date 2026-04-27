CREATE TABLE IF NOT EXISTS public.plan_features (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saas_plan_features (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    plan_id UUID NOT NULL REFERENCES public.saas_plans(id) ON DELETE CASCADE,
    feature_id TEXT NOT NULL REFERENCES public.plan_features(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT saas_plan_features_unique UNIQUE (plan_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_key ON public.plan_features(key);
CREATE INDEX IF NOT EXISTS idx_saas_plan_features_plan_id ON public.saas_plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_saas_plan_features_feature_id ON public.saas_plan_features(feature_id);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read plan features" ON public.plan_features;
CREATE POLICY "Authenticated can read plan features" ON public.plan_features
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role can manage plan features" ON public.plan_features;
CREATE POLICY "Service role can manage plan features" ON public.plan_features
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read saas plan features" ON public.saas_plan_features;
CREATE POLICY "Authenticated can read saas plan features" ON public.saas_plan_features
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role can manage saas plan features" ON public.saas_plan_features;
CREATE POLICY "Service role can manage saas plan features" ON public.saas_plan_features
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
DECLARE
    companies_kind CHAR;
BEGIN
    SELECT c.relkind
    INTO companies_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'companies';

    IF companies_kind IS NULL OR companies_kind IN ('v', 'm') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.companies AS
        SELECT
            o.id,
            o.name,
            o.slug,
            o.subscription_plan AS plan_code,
            o.subscription_status,
            o.settings,
            o.created_at,
            o.updated_at
        FROM public.organizations o';
    END IF;
END $$;

DO $$
DECLARE
    plans_kind CHAR;
BEGIN
    SELECT c.relkind
    INTO plans_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'plans';

    IF plans_kind IS NULL OR plans_kind IN ('v', 'm') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.plans AS
        SELECT
            p.id,
            p.name,
            p.slug,
            p.price_monthly,
            p.price_yearly,
            p.features,
            p.is_active,
            p.created_at,
            p.updated_at
        FROM public.saas_plans p';
    END IF;
END $$;

DO $$
DECLARE
    company_users_kind CHAR;
BEGIN
    SELECT c.relkind
    INTO company_users_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'company_users';

    IF company_users_kind IS NULL OR company_users_kind IN ('v', 'm') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.company_users AS
        SELECT
            om.id,
            om.organization_id AS company_id,
            om.user_id,
            om.role_id,
            om.is_owner,
            om.created_at,
            om.updated_at
        FROM public.organization_members om';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_company_plan(raw_plan TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE UPPER(COALESCE(raw_plan, ''))
    WHEN 'BASIC' THEN 'STARTER'
    WHEN 'STARTER' THEN 'STARTER'
    WHEN 'PRO' THEN 'PROFESSIONAL'
    WHEN 'PROFESSIONAL' THEN 'PROFESSIONAL'
    WHEN 'PREMIUM' THEN 'PREMIUM'
    WHEN 'ENTERPRISE' THEN 'ENTERPRISE'
    ELSE 'FREE'
  END
$$;

CREATE OR REPLACE FUNCTION public.normalize_company_role(raw_role TEXT, is_owner BOOLEAN DEFAULT FALSE)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN is_owner THEN 'OWNER'
    WHEN UPPER(COALESCE(raw_role, '')) IN ('SUPER_ADMIN') THEN 'SUPER_ADMIN'
    WHEN UPPER(COALESCE(raw_role, '')) IN ('OWNER') THEN 'OWNER'
    WHEN UPPER(COALESCE(raw_role, '')) IN ('ADMIN', 'MANAGER') THEN 'ADMIN'
    WHEN UPPER(COALESCE(raw_role, '')) IN ('SELLER', 'VENDEDOR', 'CASHIER') THEN 'SELLER'
    WHEN UPPER(COALESCE(raw_role, '')) IN ('WAREHOUSE', 'DEPOSITO') THEN 'WAREHOUSE'
    ELSE 'UNKNOWN'
  END
$$;

CREATE OR REPLACE FUNCTION public.company_plan_has_feature(company_uuid UUID, feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH company_plan AS (
    SELECT public.normalize_company_plan(o.subscription_plan) AS plan_name
    FROM public.organizations o
    WHERE o.id = company_uuid
  )
  SELECT EXISTS (
    SELECT 1
    FROM company_plan cp
    WHERE (
      cp.plan_name = 'FREE'
      AND feature_key IN ('basic_inventory', 'basic_sales')
    ) OR (
      cp.plan_name = 'STARTER'
      AND feature_key IN ('basic_inventory', 'basic_sales', 'purchase_module', 'basic_reports', 'team_management', 'admin_panel', 'advanced_inventory')
    ) OR (
      cp.plan_name IN ('PROFESSIONAL', 'PREMIUM', 'ENTERPRISE')
      AND feature_key IN (
        'basic_inventory',
        'basic_sales',
        'purchase_module',
        'basic_reports',
        'advanced_reports',
        'multi_branch',
        'audit_logs',
        'unlimited_users',
        'export_reports',
        'team_management',
        'admin_panel',
        'advanced_inventory',
        'api_access',
        'loyalty_program',
        'unlimited_products',
        'custom_branding'
      )
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_permissions(company_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(permission_name TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH membership AS (
    SELECT
      om.user_id,
      om.organization_id,
      om.is_owner,
      r.name AS raw_role_name
    FROM public.organization_members om
    LEFT JOIN public.roles r ON r.id = om.role_id
    WHERE om.organization_id = company_uuid
      AND om.user_id = user_uuid
    LIMIT 1
  ),
  global_roles AS (
    SELECT r.name AS role_name
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_uuid
      AND ur.is_active = TRUE
      AND (ur.organization_id IS NULL OR ur.organization_id = company_uuid)
  ),
  effective_roles AS (
    SELECT DISTINCT role_name
    FROM (
      SELECT public.normalize_company_role(m.raw_role_name, m.is_owner) AS role_name
      FROM membership m
      UNION ALL
      SELECT UPPER(m.raw_role_name) FROM membership m
      UNION ALL
      SELECT UPPER(gr.role_name) FROM global_roles gr
      UNION ALL
      SELECT CASE
        WHEN public.normalize_company_role(m.raw_role_name, m.is_owner) = 'SELLER' THEN 'CASHIER'
        WHEN public.normalize_company_role(m.raw_role_name, m.is_owner) = 'ADMIN' THEN 'MANAGER'
        ELSE NULL
      END
      FROM membership m
    ) roleset
    WHERE role_name IS NOT NULL AND role_name <> 'UNKNOWN'
  )
  SELECT DISTINCT p.name AS permission_name
  FROM effective_roles er
  JOIN public.roles r ON UPPER(r.name) = er.role_name
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE p.is_active = TRUE
$$;

CREATE OR REPLACE FUNCTION public.user_has_company_permission(company_uuid UUID, permission_key TEXT, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.get_user_company_permissions(company_uuid, user_uuid) permissions
    WHERE permissions.permission_name = permission_key
  )
$$;

CREATE OR REPLACE FUNCTION public.authorize_company_action(
  company_uuid UUID,
  permission_key TEXT,
  feature_key TEXT DEFAULT NULL,
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.user_has_company_permission(company_uuid, permission_key, user_uuid)
    AND (
      feature_key IS NULL
      OR public.company_plan_has_feature(company_uuid, feature_key)
    )
$$;

GRANT SELECT ON public.companies TO authenticated, service_role;
GRANT SELECT ON public.plans TO authenticated, service_role;
GRANT SELECT ON public.company_users TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_company_plan(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_company_role(TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_plan_has_feature(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_company_permissions(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_company_permission(UUID, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authorize_company_action(UUID, TEXT, TEXT, UUID) TO authenticated, service_role;
