import type { Plan, PlanLimits } from '@/hooks/use-subscription'
import { getCanonicalFeatureLabel, normalizePlanSlug } from '@/lib/plan-catalog'

type LimitKey = keyof PlanLimits

type PlanLimitSource = {
  slug?: string | null
  limits?: Partial<Record<LimitKey, number | null>> | Record<string, unknown> | null
  max_users?: number | null
  max_products?: number | null
  max_transactions_per_month?: number | null
  max_locations?: number | null
  features?: string[] | null
}

export type ComparisonRow =
  | { key: string; label: string; kind: 'limit'; value: (plan: Plan) => string }
  | { key: string; label: string; kind: 'feature'; feature: string }

const LIMIT_LABELS: Record<LimitKey, string> = {
  maxUsers: 'Usuarios',
  maxProducts: 'Productos',
  maxTransactionsPerMonth: 'Transacciones / mes',
  maxLocations: 'Sucursales',
}

const DEFAULT_LIMITS_BY_PLAN: Record<string, Required<PlanLimits>> = {
  free: {
    maxUsers: 1,
    maxProducts: 100,
    maxTransactionsPerMonth: 200,
    maxLocations: 1,
  },
  starter: {
    maxUsers: 5,
    maxProducts: 1000,
    maxTransactionsPerMonth: 2000,
    maxLocations: 1,
  },
  professional: {
    maxUsers: -1,
    maxProducts: -1,
    maxTransactionsPerMonth: -1,
    maxLocations: -1,
  },
}

const FEATURE_PRIORITY = [
  'basic_sales',
  'basic_inventory',
  'purchase_module',
  'advanced_inventory',
  'team_management',
  'admin_panel',
  'basic_reports',
  'advanced_reports',
  'multi_branch',
  'audit_logs',
  'export_reports',
  'api_access',
  'loyalty_program',
  'custom_branding',
  'unlimited_users',
  'unlimited_products',
] as const

const PLAN_NARRATIVES: Record<
  string,
  {
    summary: string
    audience: string
    badge: string
  }
> = {
  free: {
    summary: 'Base operativa para validar ventas, inventario y un flujo simple de caja.',
    audience: 'Negocios que empiezan o una sola operacion con bajo volumen.',
    badge: 'Inicio rapido',
  },
  starter: {
    summary: 'Cobertura estable para un equipo pequeno con compras, reportes y control operativo.',
    audience: 'Tiendas que ya venden todos los dias y necesitan administracion centralizada.',
    badge: 'Mas elegido',
  },
  professional: {
    summary: 'Nivel preparado para crecimiento, mas sucursales y supervision administrativa real.',
    audience: 'Equipos en expansion, multi sucursal o con necesidades de trazabilidad.',
    badge: 'Escala y control',
  },
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function getLimitFallback(source: PlanLimitSource, key: LimitKey): number {
  const planDefaults = DEFAULT_LIMITS_BY_PLAN[normalizePlanSlug(source.slug)] || DEFAULT_LIMITS_BY_PLAN.free
  return planDefaults[key]
}

function getSourceLimit(source: PlanLimitSource, key: LimitKey): number | null {
  const rawFromJson = toFiniteNumber(source.limits?.[key])
  if (rawFromJson !== null && rawFromJson !== 0) {
    return rawFromJson
  }

  switch (key) {
    case 'maxUsers':
      return toFiniteNumber(source.max_users)
    case 'maxProducts':
      return toFiniteNumber(source.max_products)
    case 'maxTransactionsPerMonth':
      return toFiniteNumber(source.max_transactions_per_month)
    case 'maxLocations':
      return toFiniteNumber(source.max_locations)
    default:
      return null
  }
}

export function isUnlimitedLimit(value?: number | null) {
  return typeof value === 'number' && (value < 0 || value >= 999999)
}

export function resolvePlanLimits(source: PlanLimitSource): Required<PlanLimits> {
  const features = new Set((source.features || []).map((feature) => String(feature).trim()))

  const maxUsers = features.has('unlimited_users')
    ? -1
    : (getSourceLimit(source, 'maxUsers') ?? getLimitFallback(source, 'maxUsers'))

  const maxProducts = features.has('unlimited_products')
    ? -1
    : (getSourceLimit(source, 'maxProducts') ?? getLimitFallback(source, 'maxProducts'))

  const maxTransactionsPerMonth =
    getSourceLimit(source, 'maxTransactionsPerMonth') ?? getLimitFallback(source, 'maxTransactionsPerMonth')

  const maxLocations =
    getSourceLimit(source, 'maxLocations') ?? getLimitFallback(source, 'maxLocations')

  return {
    maxUsers,
    maxProducts,
    maxTransactionsPerMonth,
    maxLocations,
  }
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function getPlanFeatureLabels(features: string[]) {
  return features
    .map((feature) => String(feature).trim())
    .filter(Boolean)
    .sort((a, b) => {
      const aIndex = FEATURE_PRIORITY.indexOf(a as (typeof FEATURE_PRIORITY)[number])
      const bIndex = FEATURE_PRIORITY.indexOf(b as (typeof FEATURE_PRIORITY)[number])
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex
      if (normalizedA !== normalizedB) return normalizedA - normalizedB
      return a.localeCompare(b)
    })
    .map((feature) => getCanonicalFeatureLabel(feature))
}

export function getRecommendedPlan(plans: Plan[]) {
  const paidPlans = plans.filter((plan) => plan.priceMonthly > 0)
  if (!paidPlans.length) return plans[0] || null

  return [...paidPlans].sort((a, b) => {
    if ((b.yearlyDiscount || 0) !== (a.yearlyDiscount || 0)) {
      return (b.yearlyDiscount || 0) - (a.yearlyDiscount || 0)
    }

    return a.priceMonthly - b.priceMonthly
  })[0]
}

export function getPlanNarrative(slug: string | null | undefined) {
  return PLAN_NARRATIVES[normalizePlanSlug(slug)] || PLAN_NARRATIVES.free
}

export function formatLimitValue(key: LimitKey, value?: number | null) {
  if (isUnlimitedLimit(value)) {
    switch (key) {
      case 'maxTransactionsPerMonth':
        return 'Ilimitadas'
      case 'maxLocations':
        return 'Ilimitadas'
      default:
        return 'Ilimitado'
    }
  }

  const safeValue = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
  const number = new Intl.NumberFormat('es-PY').format(safeValue)

  switch (key) {
    case 'maxTransactionsPerMonth':
      return `${number} / mes`
    case 'maxLocations':
      return safeValue === 1 ? '1 sucursal' : `${number} sucursales`
    case 'maxUsers':
      return safeValue === 1 ? '1 usuario' : `${number} usuarios`
    case 'maxProducts':
      return `${number} productos`
    default:
      return number
  }
}

export function getPlanLimitItems(plan: Plan) {
  const resolved = resolvePlanLimits({
    slug: plan.slug,
    limits: plan.limits,
    features: plan.features,
  })

  return (Object.keys(LIMIT_LABELS) as LimitKey[]).map((key) => ({
    key,
    label: LIMIT_LABELS[key],
    value: formatLimitValue(key, resolved[key]),
  }))
}

export function getBillingBadgeDiscount(plans: Plan[]) {
  const discounts = plans.map((plan) => plan.yearlyDiscount || 0).filter((value) => value > 0)
  return discounts.length ? Math.max(...discounts) : 0
}

export function buildPublicRegistrationPath(planSlug?: string | null) {
  if (!planSlug) {
    return '/inicio/registro'
  }

  return `/inicio/registro?plan=${encodeURIComponent(planSlug)}`
}

export function buildComparisonRows(plans: Plan[]): ComparisonRow[] {
  const limitRows: ComparisonRow[] = (Object.keys(LIMIT_LABELS) as LimitKey[]).map((key) => ({
    key,
    label: LIMIT_LABELS[key],
    kind: 'limit',
    value: (plan: Plan) => {
      const limits = resolvePlanLimits({
        slug: plan.slug,
        limits: plan.limits,
        features: plan.features,
      })
      return formatLimitValue(key, limits[key])
    },
  }))

  const featureRows: ComparisonRow[] = Array.from(
    new Set(plans.flatMap((plan) => (plan.features || []).map((feature) => String(feature).trim()).filter(Boolean)))
  )
    .sort((a, b) => {
      const aIndex = FEATURE_PRIORITY.indexOf(a as (typeof FEATURE_PRIORITY)[number])
      const bIndex = FEATURE_PRIORITY.indexOf(b as (typeof FEATURE_PRIORITY)[number])
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex
      if (normalizedA !== normalizedB) return normalizedA - normalizedB
      return a.localeCompare(b)
    })
    .map((feature) => ({
      key: `feature:${feature}`,
      label: getCanonicalFeatureLabel(feature),
      kind: 'feature' as const,
      feature,
    }))

  return [...limitRows, ...featureRows]
}

export function buildPlanFaqs(highestTrialDays: number) {
  return [
    {
      question: 'Puedo cambiar de plan despues de activar la cuenta?',
      answer:
        'Si. El plan puede ajustarse cuando el negocio cambia de volumen o necesita nuevas funciones. La migracion del catalogo y usuarios no requiere rehacer la cuenta.',
    },
    {
      question: 'El cobro anual tiene descuento real?',
      answer:
        'Si el plan publica descuento anual, ya esta reflejado en el comparador y en el precio anual mostrado arriba.',
    },
    {
      question: 'Que pasa si alcanzo el limite del plan?',
      answer:
        'El sistema puede seguir operando con alertas y luego sugerir upgrade segun el tipo de limite. Conviene revisar capacidad antes de llegar al tope.',
    },
    {
      question: 'Todos los planes incluyen prueba inicial?',
      answer:
        highestTrialDays > 0
          ? `No necesariamente. Hoy existen planes con hasta ${highestTrialDays} dias de prueba, segun la configuracion comercial activa.`
          : 'La prueba inicial depende del plan publicado y de la configuracion comercial vigente.',
    },
  ]
}
