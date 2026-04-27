export const CANONICAL_PLAN_SLUGS = ['free', 'starter', 'professional'] as const

export type CanonicalPlanSlug = (typeof CANONICAL_PLAN_SLUGS)[number]

const PLAN_ALIAS_MAP: Record<string, CanonicalPlanSlug> = {
  free: 'free',
  starter: 'starter',
  basic: 'starter',
  professional: 'professional',
  pro: 'professional',
  premium: 'professional',
  enterprise: 'professional',
}

const PLAN_DISPLAY_NAMES: Record<CanonicalPlanSlug, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
}

const PLAN_ALIASES: Record<CanonicalPlanSlug, string[]> = {
  free: ['free'],
  starter: ['starter', 'basic'],
  professional: ['professional', 'pro', 'premium', 'enterprise'],
}

const PLAN_ORDER: Record<CanonicalPlanSlug, number> = {
  free: 0,
  starter: 1,
  professional: 2,
}

const FEATURE_LABELS: Record<string, string> = {
  basic_inventory: 'Inventario basico',
  basic_sales: 'Ventas basicas',
  purchase_module: 'Compras',
  basic_reports: 'Reportes basicos',
  advanced_reports: 'Reportes avanzados',
  team_management: 'Gestion de equipo',
  admin_panel: 'Panel admin',
  advanced_inventory: 'Inventario avanzado',
  multi_branch: 'Multi sucursal',
  audit_logs: 'Auditoria',
  unlimited_users: 'Usuarios ilimitados',
  export_reports: 'Exportacion',
  loyalty_program: 'Fidelizacion',
  custom_branding: 'Marca personalizada',
  api_access: 'API',
  unlimited_products: 'Productos ilimitados',
}

export function normalizePlanSlug(raw: string | null | undefined): CanonicalPlanSlug {
  const normalized = String(raw || '').trim().toLowerCase()
  return PLAN_ALIAS_MAP[normalized] || 'free'
}

export function normalizePlanCode(raw: string | null | undefined): 'FREE' | 'STARTER' | 'PROFESSIONAL' {
  return normalizePlanSlug(raw).toUpperCase() as 'FREE' | 'STARTER' | 'PROFESSIONAL'
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
