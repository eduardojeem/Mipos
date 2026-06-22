export const CANONICAL_PLAN_SLUGS = ['free', 'starter', 'professional', 'enterprise'] as const

export type CanonicalPlanSlug = (typeof CANONICAL_PLAN_SLUGS)[number]

export type PlanLimitKey =
  | 'maxUsers'
  | 'maxProducts'
  | 'maxTransactionsPerMonth'
  | 'maxLocations'
  | 'maxServices'
  | 'maxAppointmentsPerMonth'
  | 'maxStaff'

export type PlanLimits = Record<PlanLimitKey, number>

export type PlanFeatureKey =
  | 'basic_inventory'
  | 'basic_sales'
  | 'public_catalog'
  | 'online_orders'
  | 'marketplace_public'
  | 'services_catalog'
  | 'appointments'
  | 'staff_management'
  | 'public_booking'
  | 'purchase_module'
  | 'basic_reports'
  | 'advanced_reports'
  | 'multi_branch'
  | 'audit_logs'
  | 'unlimited_users'
  | 'unlimited_products'
  | 'export_reports'
  | 'team_management'
  | 'admin_panel'
  | 'advanced_inventory'
  | 'api_access'
  | 'loyalty_program'
  | 'custom_branding'

export type PlanFeatureGroup = 'core' | 'commerce' | 'services' | 'operations' | 'team' | 'reports' | 'growth' | 'enterprise'

export type PlanFeatureDefinition = {
  key: PlanFeatureKey
  label: string
  description: string
  group: PlanFeatureGroup
}

const PLAN_ALIAS_MAP: Record<string, CanonicalPlanSlug> = {
  free: 'free',
  starter: 'starter',
  basic: 'starter',
  professional: 'professional',
  pro: 'professional',
  premium: 'professional',
  enterprise: 'enterprise',
}

const PLAN_DISPLAY_NAMES: Record<CanonicalPlanSlug, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

const PLAN_ALIASES: Record<CanonicalPlanSlug, string[]> = {
  free: ['free'],
  starter: ['starter', 'basic'],
  professional: ['professional', 'pro', 'premium'],
  enterprise: ['enterprise'],
}

const PLAN_ORDER: Record<CanonicalPlanSlug, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
}

const FEATURE_LABELS: Record<string, string> = {
  basic_sales: 'Punto de venta y caja',
  basic_inventory: 'Control de stock',
  public_catalog: 'Catalogo publico ecommerce',
  online_orders: 'Pedidos online',
  marketplace_public: 'Marketplace publico',
  services_catalog: 'Catalogo de servicios',
  appointments: 'Agenda de turnos',
  staff_management: 'Profesionales y staff',
  public_booking: 'Reservas online',
  purchase_module: 'Modulo de compras',
  advanced_inventory: 'Inventario avanzado con alertas',
  team_management: 'Gestion de usuarios y roles',
  admin_panel: 'Panel de administracion',
  audit_logs: 'Historial de auditoria',
  basic_reports: 'Reportes de ventas',
  advanced_reports: 'Reportes avanzados y analisis',
  export_reports: 'Exportacion de reportes',
  multi_branch: 'Multiples sucursales',
  unlimited_users: 'Usuarios sin limite',
  unlimited_products: 'Productos sin limite',
  api_access: 'Acceso a API',
  loyalty_program: 'Programa de fidelizacion',
  custom_branding: 'Marca personalizada',
}

export const PLAN_FEATURE_DEFINITIONS: PlanFeatureDefinition[] = [
  { key: 'basic_sales', label: 'Punto de venta y caja', description: 'Ventas, caja y flujo comercial basico.', group: 'core' },
  { key: 'public_catalog', label: 'Catalogo publico ecommerce', description: 'Catalogo online con productos publicados por el negocio.', group: 'commerce' },
  { key: 'online_orders', label: 'Pedidos online', description: 'Carrito, checkout y seguimiento de pedidos web.', group: 'commerce' },
  { key: 'marketplace_public', label: 'Marketplace publico', description: 'Presencia en el catalogo global multiempresa.', group: 'growth' },
  { key: 'services_catalog', label: 'Catalogo de servicios', description: 'Servicios con duracion, precio y disponibilidad operativa.', group: 'services' },
  { key: 'appointments', label: 'Agenda de turnos', description: 'Gestion de reservas, estados y calendario operativo.', group: 'services' },
  { key: 'staff_management', label: 'Profesionales y staff', description: 'Gestion de profesionales, horarios y disponibilidad.', group: 'services' },
  { key: 'public_booking', label: 'Reservas online', description: 'Pagina publica para que clientes reserven turnos.', group: 'services' },
  { key: 'basic_inventory', label: 'Control de stock', description: 'Catalogo, stock y movimientos basicos.', group: 'core' },
  { key: 'admin_panel', label: 'Panel de administracion', description: 'Acceso al panel administrativo de la organizacion.', group: 'core' },
  { key: 'purchase_module', label: 'Modulo de compras', description: 'Registro de compras y reposicion.', group: 'operations' },
  { key: 'advanced_inventory', label: 'Inventario avanzado', description: 'Alertas, ajustes y controles avanzados.', group: 'operations' },
  { key: 'multi_branch', label: 'Multiples sucursales', description: 'Gestion de mas de una sucursal o punto de venta.', group: 'operations' },
  { key: 'team_management', label: 'Usuarios y roles', description: 'Administracion de equipo, roles e invitaciones.', group: 'team' },
  { key: 'audit_logs', label: 'Historial de auditoria', description: 'Trazabilidad de acciones sensibles.', group: 'team' },
  { key: 'basic_reports', label: 'Reportes de ventas', description: 'Metricas y reportes operativos basicos.', group: 'reports' },
  { key: 'advanced_reports', label: 'Reportes avanzados', description: 'Analisis ampliado para operacion y gerencia.', group: 'reports' },
  { key: 'export_reports', label: 'Exportacion de reportes', description: 'Descarga de informacion para analisis externo.', group: 'reports' },
  { key: 'loyalty_program', label: 'Programa de fidelizacion', description: 'Beneficios, puntos o reglas de fidelizacion.', group: 'growth' },
  { key: 'custom_branding', label: 'Marca personalizada', description: 'Personalizacion visual publica y comercial.', group: 'growth' },
  { key: 'unlimited_users', label: 'Usuarios sin limite', description: 'Remueve el limite operativo de usuarios.', group: 'enterprise' },
  { key: 'unlimited_products', label: 'Productos sin limite', description: 'Remueve el limite operativo de productos.', group: 'enterprise' },
  { key: 'api_access', label: 'Acceso a API', description: 'Integraciones externas y automatizaciones.', group: 'enterprise' },
]

export const CANONICAL_PLAN_FEATURES: Record<CanonicalPlanSlug, PlanFeatureKey[]> = {
  free: ['basic_inventory', 'basic_sales', 'public_catalog', 'services_catalog', 'admin_panel'],
  starter: [
    'basic_inventory',
    'basic_sales',
    'public_catalog',
    'online_orders',
    'marketplace_public',
    'services_catalog',
    'appointments',
    'staff_management',
    'public_booking',
    'purchase_module',
    'basic_reports',
    'team_management',
    'admin_panel',
    'advanced_inventory',
    'multi_branch',
  ],
  professional: [
    'basic_inventory',
    'basic_sales',
    'public_catalog',
    'online_orders',
    'marketplace_public',
    'services_catalog',
    'appointments',
    'staff_management',
    'public_booking',
    'purchase_module',
    'basic_reports',
    'advanced_reports',
    'multi_branch',
    'audit_logs',
    'export_reports',
    'team_management',
    'admin_panel',
    'advanced_inventory',
    'loyalty_program',
    'custom_branding',
  ],
  enterprise: [
    'basic_inventory',
    'basic_sales',
    'public_catalog',
    'online_orders',
    'marketplace_public',
    'services_catalog',
    'appointments',
    'staff_management',
    'public_booking',
    'purchase_module',
    'basic_reports',
    'advanced_reports',
    'multi_branch',
    'audit_logs',
    'unlimited_users',
    'unlimited_products',
    'export_reports',
    'team_management',
    'admin_panel',
    'advanced_inventory',
    'api_access',
    'loyalty_program',
    'custom_branding',
  ],
}

export const CANONICAL_PLAN_LIMITS: Record<CanonicalPlanSlug, PlanLimits> = {
  free: {
    maxUsers: 1,
    maxProducts: 50,
    maxTransactionsPerMonth: 200,
    maxLocations: 1,
    maxServices: 5,
    maxAppointmentsPerMonth: 0,
    maxStaff: 0,
  },
  starter: {
    maxUsers: 5,
    maxProducts: 500,
    maxTransactionsPerMonth: 1000,
    maxLocations: 3,
    maxServices: 25,
    maxAppointmentsPerMonth: 200,
    maxStaff: 5,
  },
  professional: {
    maxUsers: 20,
    maxProducts: 5000,
    maxTransactionsPerMonth: 10000,
    maxLocations: 10,
    maxServices: 200,
    maxAppointmentsPerMonth: 2000,
    maxStaff: 20,
  },
  enterprise: {
    maxUsers: -1,
    maxProducts: -1,
    maxTransactionsPerMonth: -1,
    maxLocations: -1,
    maxServices: -1,
    maxAppointmentsPerMonth: -1,
    maxStaff: -1,
  },
}

const VALID_FEATURE_KEYS = new Set<string>(PLAN_FEATURE_DEFINITIONS.map((feature) => feature.key))

const FEATURE_ALIAS_MAP: Record<string, PlanFeatureKey> = {
  analytics: 'basic_reports',
  multiple_branches: 'multi_branch',
}

const PUBLIC_PLAN_FEATURE_KEYS = new Set<PlanFeatureKey>([
  'basic_inventory',
  'basic_sales',
  'public_catalog',
  'online_orders',
  'marketplace_public',
  'services_catalog',
  'appointments',
  'staff_management',
  'public_booking',
  'purchase_module',
  'basic_reports',
  'advanced_reports',
  'multi_branch',
  'export_reports',
  'team_management',
  'admin_panel',
  'advanced_inventory',
  'loyalty_program',
  'custom_branding',
])

function featureName(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && 'name' in raw) return String((raw as { name?: unknown }).name || '')
  return ''
}

export function normalizePlanFeatureKey(raw: unknown): PlanFeatureKey | null {
  const key = featureName(raw).trim().toLowerCase()
  if (!key) return null
  if (VALID_FEATURE_KEYS.has(key)) return key as PlanFeatureKey
  return FEATURE_ALIAS_MAP[key] || null
}

export function sanitizePlanFeatures(raw: unknown, fallbackPlan?: string | null): PlanFeatureKey[] {
  const source = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object'
      ? Object.keys(raw as Record<string, unknown>).filter((key) => Boolean((raw as Record<string, unknown>)[key]))
      : [])

  const features = Array.from(new Set(source.map(normalizePlanFeatureKey).filter(Boolean))) as PlanFeatureKey[]
  if (features.length > 0) return features
  return [...CANONICAL_PLAN_FEATURES[normalizePlanSlug(fallbackPlan)]]
}

export function isPublicPlanFeature(raw: unknown): raw is PlanFeatureKey {
  const feature = normalizePlanFeatureKey(raw)
  return Boolean(feature && PUBLIC_PLAN_FEATURE_KEYS.has(feature))
}

export function getPublicPlanFeatures(raw: unknown, fallbackPlan?: string | null): PlanFeatureKey[] {
  return sanitizePlanFeatures(raw, fallbackPlan).filter(isPublicPlanFeature)
}

function finiteLimit(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return null
}

function normalizeLimitValue(raw: unknown, fallback: number) {
  const parsed = finiteLimit(raw)
  if (parsed === null) return fallback
  if (parsed < 0) return -1
  return parsed
}

export function sanitizePlanLimits(raw: unknown, fallbackPlan?: string | null): PlanLimits {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const fallback = CANONICAL_PLAN_LIMITS[normalizePlanSlug(fallbackPlan)]

  return {
    maxUsers: normalizeLimitValue(source.maxUsers ?? source.max_users, fallback.maxUsers),
    maxProducts: normalizeLimitValue(source.maxProducts ?? source.max_products, fallback.maxProducts),
    maxTransactionsPerMonth: normalizeLimitValue(
      source.maxTransactionsPerMonth ?? source.max_transactions_per_month,
      fallback.maxTransactionsPerMonth
    ),
    maxLocations: normalizeLimitValue(source.maxLocations ?? source.max_locations, fallback.maxLocations),
    maxServices: normalizeLimitValue(source.maxServices ?? source.max_services, fallback.maxServices),
    maxAppointmentsPerMonth: normalizeLimitValue(
      source.maxAppointmentsPerMonth ?? source.max_appointments_per_month,
      fallback.maxAppointmentsPerMonth
    ),
    maxStaff: normalizeLimitValue(source.maxStaff ?? source.max_staff, fallback.maxStaff),
  }
}

export function getCanonicalPlanDefaults(slug: string | null | undefined) {
  const canonicalSlug = normalizePlanSlug(slug)
  return {
    name: PLAN_DISPLAY_NAMES[canonicalSlug],
    slug: canonicalSlug,
    features: [...CANONICAL_PLAN_FEATURES[canonicalSlug]],
    limits: { ...CANONICAL_PLAN_LIMITS[canonicalSlug] },
  }
}

export function normalizePlanSlug(raw: string | null | undefined): CanonicalPlanSlug {
  const normalized = String(raw || '').trim().toLowerCase()
  return PLAN_ALIAS_MAP[normalized] || 'free'
}

export function normalizePlanCode(raw: string | null | undefined): 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' {
  return normalizePlanSlug(raw).toUpperCase() as 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
}

export function isCanonicalPlanSlug(raw: string | null | undefined): raw is CanonicalPlanSlug {
  return CANONICAL_PLAN_SLUGS.includes(String(raw || '').trim().toLowerCase() as CanonicalPlanSlug)
}

export function getCanonicalPlanDisplayName(slug: string | null | undefined): string {
  return PLAN_DISPLAY_NAMES[normalizePlanSlug(slug)]
}

export function getCanonicalPlanAliases(slug: string | null | undefined): string[] {
  return PLAN_ALIASES[normalizePlanSlug(slug)]
}

export function compareCanonicalPlanOrder(a: string | null | undefined, b: string | null | undefined): number {
  return PLAN_ORDER[normalizePlanSlug(a)] - PLAN_ORDER[normalizePlanSlug(b)]
}

export function getCanonicalFeatureLabel(feature: string): string {
  const key = String(feature || '').trim()
  return FEATURE_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function dedupeCanonicalPlans<T extends { slug?: string | null; name?: string | null }>(
  plans: T[],
  pickPreferred?: (current: T | undefined, candidate: T) => T
): T[] {
  const grouped = new Map<CanonicalPlanSlug, T>()

  for (const plan of plans) {
    const slug = normalizePlanSlug(plan.slug)
    const current = grouped.get(slug)
    grouped.set(slug, pickPreferred ? pickPreferred(current, plan) : (current || plan))
  }

  return Array.from(grouped.entries())
    .sort((a, b) => compareCanonicalPlanOrder(a[0], b[0]))
    .map(([, plan]) => plan)
}
