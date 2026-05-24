-- Read-only audit for /superadmin/plans, /superadmin/subscriptions and /superadmin/organizations.
-- Shows mismatches between the operational organization state and billing/subscription tables.

WITH normalized AS (
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    UPPER(COALESCE(o.subscription_plan, 'FREE')) AS organization_plan,
    UPPER(COALESCE(o.subscription_status, '')) AS organization_status,
    ss.id AS saas_subscription_id,
    UPPER(COALESCE(ss.status, '')) AS saas_status,
    LOWER(COALESCE(sp.slug, '')) AS saas_plan_slug,
    UPPER(COALESCE(sp.slug, 'FREE')) AS saas_plan,
    LOWER(COALESCE(ps.plan_type, '')) AS plan_subscription_type,
    ps.is_active AS plan_subscription_active
  FROM public.organizations o
  LEFT JOIN public.saas_subscriptions ss ON ss.organization_id = o.id
  LEFT JOIN public.saas_plans sp ON sp.id = ss.plan_id
  LEFT JOIN public.plan_subscriptions ps ON ps.company_id = o.id
)
SELECT
  organization_id,
  organization_name,
  organization_slug,
  organization_plan,
  saas_plan,
  plan_subscription_type,
  organization_status,
  saas_status,
  plan_subscription_active,
  CASE
    WHEN saas_subscription_id IS NULL THEN 'missing_saas_subscription'
    WHEN organization_plan <> saas_plan THEN 'plan_mismatch'
    WHEN organization_status IN ('ACTIVE', 'TRIAL') AND saas_status NOT IN ('ACTIVE', 'TRIAL', 'TRIALING') THEN 'status_mismatch'
    WHEN organization_status IN ('CANCELLED', 'SUSPENDED') AND saas_status IN ('ACTIVE', 'TRIAL', 'TRIALING') THEN 'status_mismatch'
    WHEN organization_status IN ('ACTIVE', 'TRIAL') AND plan_subscription_active IS DISTINCT FROM TRUE THEN 'inactive_plan_subscription'
    WHEN organization_status IN ('CANCELLED', 'SUSPENDED') AND plan_subscription_active IS TRUE THEN 'active_plan_subscription_for_inactive_org'
    WHEN plan_subscription_type <> '' AND organization_plan <> UPPER(plan_subscription_type) THEN 'plan_subscription_type_mismatch'
    ELSE 'ok'
  END AS audit_result
FROM normalized
WHERE
  saas_subscription_id IS NULL
  OR organization_plan <> saas_plan
  OR (organization_status IN ('ACTIVE', 'TRIAL') AND saas_status NOT IN ('ACTIVE', 'TRIAL', 'TRIALING'))
  OR (organization_status IN ('CANCELLED', 'SUSPENDED') AND saas_status IN ('ACTIVE', 'TRIAL', 'TRIALING'))
  OR (organization_status IN ('ACTIVE', 'TRIAL') AND plan_subscription_active IS DISTINCT FROM TRUE)
  OR (organization_status IN ('CANCELLED', 'SUSPENDED') AND plan_subscription_active IS TRUE)
  OR (plan_subscription_type <> '' AND organization_plan <> UPPER(plan_subscription_type))
ORDER BY organization_name;

