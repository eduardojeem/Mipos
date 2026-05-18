-- ============================================================
-- SCRIPT DE VERIFICACIÓN: Sucursales permitidas por plan
-- Ejecutar en Supabase SQL Editor (solo lectura, sin cambios)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. LÍMITES CONFIGURADOS EN saas_plans
--    Muestra lo que tiene la DB comparado con lo esperado.
-- ─────────────────────────────────────────────────────────────
SELECT
  sp.slug,
  sp.name,
  sp.is_active,
  sp.max_locations                                             AS max_sucursales_db,

  -- Valor esperado según diseño del sistema
  CASE
    WHEN sp.slug IN ('free',         'FREE',         'Free')         THEN 1
    WHEN sp.slug IN ('starter',      'STARTER',      'Starter')      THEN 3
    WHEN sp.slug IN ('professional', 'PROFESSIONAL', 'Professional',
                     'pro',          'PRO',          'Pro',
                     'premium',      'PREMIUM',      'Premium')      THEN 10
    WHEN sp.slug IN ('enterprise',   'ENTERPRISE',   'Enterprise')   THEN 999999
    ELSE NULL
  END                                                          AS max_sucursales_esperado,

  -- ¿Coincide con lo esperado?
  CASE
    WHEN sp.max_locations IS NULL THEN '⚠️  SIN CONFIGURAR'
    WHEN sp.max_locations = CASE
      WHEN sp.slug IN ('free','FREE','Free')                                                          THEN 1
      WHEN sp.slug IN ('starter','STARTER','Starter')                                                 THEN 3
      WHEN sp.slug IN ('professional','PROFESSIONAL','Professional','pro','PRO','Pro','premium','PREMIUM','Premium') THEN 10
      WHEN sp.slug IN ('enterprise','ENTERPRISE','Enterprise')                                        THEN 999999
      ELSE sp.max_locations
    END THEN '✅  OK'
    ELSE '❌  INCORRECTO'
  END                                                          AS estado,

  -- ¿Tiene la feature multi_branch o multiple_branches?
  CASE
    WHEN sp.features @> '["multi_branch"]'::jsonb
      OR sp.features @> '["multiple_branches"]'::jsonb        THEN '✅  Sí'
    ELSE                                                            '❌  No'
  END                                                          AS feature_multi_branch,

  sp.price_monthly,
  sp.updated_at

FROM public.saas_plans sp
ORDER BY sp.price_monthly ASC NULLS FIRST;


-- ─────────────────────────────────────────────────────────────
-- 2. USO REAL: organizaciones y cuántas sucursales tienen
--    vs el límite de su plan
-- ─────────────────────────────────────────────────────────────
SELECT
  o.id                                                         AS org_id,
  o.name                                                       AS organizacion,
  o.subscription_plan                                          AS plan_slug,
  sp.name                                                      AS plan_nombre,
  COALESCE(sp.max_locations, 1)                                AS limite_sucursales,
  COUNT(b.id)                                                  AS sucursales_totales,
  COUNT(b.id) FILTER (WHERE b.is_active = true)                AS sucursales_activas,

  -- ¿Está dentro del límite?
  CASE
    WHEN COALESCE(sp.max_locations, 1) >= 999999 THEN '✅  Ilimitado'
    WHEN COUNT(b.id) <= COALESCE(sp.max_locations, 1)          THEN '✅  OK'
    WHEN COUNT(b.id) =  COALESCE(sp.max_locations, 1)          THEN '⚠️  Al límite'
    ELSE '❌  EXCEDE LÍMITE'
  END                                                          AS estado_limite,

  -- Cuántas puede crear todavía
  GREATEST(0, COALESCE(sp.max_locations, 1) - COUNT(b.id)::int) AS puede_crear_mas

FROM public.organizations o
LEFT JOIN public.saas_plans sp
  ON sp.slug = LOWER(o.subscription_plan)
LEFT JOIN public.branches b
  ON b.organization_id = o.id
GROUP BY o.id, o.name, o.subscription_plan, sp.name, sp.max_locations
ORDER BY estado_limite DESC, o.name ASC;


-- ─────────────────────────────────────────────────────────────
-- 3. ORGANIZACIONES QUE EXCEDEN SU LÍMITE (si las hay)
--    Útil para detectar datos inconsistentes históricos
-- ─────────────────────────────────────────────────────────────
SELECT
  o.id                                                         AS org_id,
  o.name                                                       AS organizacion,
  o.subscription_plan,
  COALESCE(sp.max_locations, 1)                                AS limite,
  COUNT(b.id)                                                  AS sucursales_actuales,
  COUNT(b.id) - COALESCE(sp.max_locations, 1)                  AS exceso

FROM public.organizations o
LEFT JOIN public.saas_plans sp
  ON sp.slug = LOWER(o.subscription_plan)
LEFT JOIN public.branches b
  ON b.organization_id = o.id
GROUP BY o.id, o.name, o.subscription_plan, sp.max_locations
HAVING COUNT(b.id) > COALESCE(sp.max_locations, 1)
   AND COALESCE(sp.max_locations, 1) < 999999
ORDER BY exceso DESC;


-- ─────────────────────────────────────────────────────────────
-- 4. DETALLE DE SUCURSALES POR ORGANIZACIÓN
--    Vista rápida de todas las sucursales y su estado
-- ─────────────────────────────────────────────────────────────
SELECT
  o.name                                                       AS organizacion,
  o.subscription_plan                                          AS plan,
  COALESCE(sp.max_locations, 1)                                AS limite_plan,
  b.name                                                       AS sucursal,
  b.slug,
  b.is_active,
  b.address,
  b.created_at::date                                           AS creada

FROM public.branches b
JOIN public.organizations o
  ON o.id = b.organization_id
LEFT JOIN public.saas_plans sp
  ON sp.slug = LOWER(o.subscription_plan)
ORDER BY o.name ASC, b.created_at ASC;


-- ─────────────────────────────────────────────────────────────
-- 5. RESUMEN EJECUTIVO
-- ─────────────────────────────────────────────────────────────
SELECT
  'Planes configurados'                                        AS metrica,
  COUNT(*)::text                                               AS valor
FROM public.saas_plans WHERE is_active = true

UNION ALL

SELECT
  'Planes sin max_locations configurado',
  COUNT(*)::text
FROM public.saas_plans
WHERE is_active = true AND max_locations IS NULL

UNION ALL

SELECT
  'Organizaciones con sucursales',
  COUNT(DISTINCT organization_id)::text
FROM public.branches

UNION ALL

SELECT
  'Total sucursales activas',
  COUNT(*)::text
FROM public.branches WHERE is_active = true

UNION ALL

SELECT
  'Organizaciones que exceden su límite',
  COUNT(*)::text
FROM (
  SELECT o.id
  FROM public.organizations o
  LEFT JOIN public.saas_plans sp ON sp.slug = LOWER(o.subscription_plan)
  LEFT JOIN public.branches b ON b.organization_id = o.id
  GROUP BY o.id, sp.max_locations
  HAVING COUNT(b.id) > COALESCE(sp.max_locations, 1)
     AND COALESCE(sp.max_locations, 1) < 999999
) excedidas;
