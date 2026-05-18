-- ============================================================
-- CORRECCIÓN: plan 'professional' tenía max_locations = NULL
-- La migración anterior usaba slug IN ('pro','premium') y no
-- capturaba el slug real 'professional'.
-- También sincroniza la feature multiple_branches en Starter.
-- ============================================================

-- 1. Fijar max_locations del plan Professional
UPDATE public.saas_plans
SET
  max_locations = 10,
  updated_at    = NOW()
WHERE slug IN ('professional', 'PROFESSIONAL', 'Professional')
  AND (max_locations IS NULL OR max_locations <> 10);

-- 2. Asegurar que Starter incluye la feature multiple_branches
--    (no la pisa si ya existe; agrega solo si falta)
UPDATE public.saas_plans
SET
  features   = features || '["multiple_branches"]'::jsonb,
  updated_at = NOW()
WHERE slug IN ('starter', 'STARTER', 'Starter')
  AND NOT (features @> '["multiple_branches"]'::jsonb)
  AND NOT (features @> '["multi_branch"]'::jsonb);

-- 3. Verificación inmediata — debe mostrar ✅ OK en todos los planes activos
SELECT
  slug,
  name,
  max_locations,
  CASE
    WHEN slug IN ('free','FREE','Free')                                                                        THEN 1
    WHEN slug IN ('starter','STARTER','Starter')                                                               THEN 3
    WHEN slug IN ('professional','PROFESSIONAL','Professional','pro','PRO','Pro','premium','PREMIUM','Premium') THEN 10
    WHEN slug IN ('enterprise','ENTERPRISE','Enterprise')                                                      THEN 999999
    ELSE NULL
  END                                                                   AS esperado,
  CASE
    WHEN max_locations IS NULL THEN '⚠️  SIN CONFIGURAR'
    WHEN max_locations = CASE
      WHEN slug IN ('free','FREE','Free')                                                                        THEN 1
      WHEN slug IN ('starter','STARTER','Starter')                                                               THEN 3
      WHEN slug IN ('professional','PROFESSIONAL','Professional','pro','PRO','Pro','premium','PREMIUM','Premium') THEN 10
      WHEN slug IN ('enterprise','ENTERPRISE','Enterprise')                                                      THEN 999999
      ELSE max_locations
    END                       THEN '✅  OK'
    ELSE                           '❌  INCORRECTO'
  END                                                                   AS estado,
  CASE
    WHEN features @> '["multiple_branches"]'::jsonb
      OR features @> '["multi_branch"]'::jsonb THEN '✅  Sí'
    ELSE                                             '—'
  END                                                                   AS tiene_multi_branch
FROM public.saas_plans
WHERE is_active = true
ORDER BY price_monthly ASC NULLS FIRST;
