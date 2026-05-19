/**
 * Definición centralizada de roles del sistema.
 *
 * TODOS los archivos que necesiten verificar o normalizar roles deben importar
 * desde aquí. Esto evita que las listas se desincronicen entre middleware,
 * endpoints de API, hooks y componentes.
 *
 * Jerarquía de roles (de mayor a menor privilegio):
 *   SUPER_ADMIN > OWNER > ADMIN > MANAGER > CASHIER > EMPLOYEE > USER
 *
 * Semántica:
 *   SUPER_ADMIN  — acceso total al panel /superadmin (cross-tenant)
 *   OWNER        — propietario de una organización; acceso total a /admin y /dashboard
 *   ADMIN        — administrador de organización; acceso a /admin con restricción de plan
 *   MANAGER      — gerente; acceso a /dashboard incluyendo reportes
 *   CASHIER      — cajero; acceso a /dashboard (POS, ventas, inventario básico)
 *   EMPLOYEE     — empleado genérico; acceso limitado a /dashboard
 *   USER         — sin rol asignado; sin acceso a rutas protegidas
 */

export const ROLE_PRIORITY = [
  'SUPER_ADMIN',
  'OWNER',
  'ADMIN',
  'MANAGER',
  'CASHIER',
  'EMPLOYEE',
  'USER',
] as const;

export type AppRole = typeof ROLE_PRIORITY[number];

/** Roles que tienen acceso a /admin y /api/admin */
export const ADMIN_ROLES: AppRole[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN'];

/** Roles que tienen acceso a /dashboard */
export const DASHBOARD_ROLES: AppRole[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'EMPLOYEE'];

/** Roles que tienen acceso a reportes (/dashboard/reports, /api/reports) */
export const REPORTS_ROLES: AppRole[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER'];

/** Roles que se consideran "admin" de una organización (tienen permisos de gestión) */
export const ORG_ADMIN_ROLES: AppRole[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN'];

/**
 * Normaliza cualquier string de rol al AppRole canónico.
 * - Aliases legacy (CASHIER, SELLER, VENDEDOR, etc.) se mapean al rol canónico.
 * - Valores desconocidos devuelven 'USER'.
 */
export function normalizeRole(role?: string | null): AppRole {
  const r = String(role || '').toUpperCase().trim();
  if (r === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (r === 'OWNER') return 'OWNER';
  if (r === 'ADMIN' || r === 'MANAGER_ADMIN') return 'ADMIN';
  if (r === 'MANAGER') return 'MANAGER';
  // CASHIER y SELLER son el mismo rol operativo — cajero/vendedor
  if (r === 'CASHIER' || r === 'SELLER' || r === 'VENDEDOR') return 'CASHIER';
  if (r === 'EMPLOYEE' || r === 'WAREHOUSE' || r === 'DEPOSITO') return 'EMPLOYEE';
  return 'USER';
}

/**
 * Devuelve el rol de mayor jerarquía de una lista de candidatos.
 */
export function pickHighestRole(...roles: Array<string | null | undefined>): AppRole {
  const normalized = roles.map(normalizeRole);
  return ROLE_PRIORITY.find((r) => normalized.includes(r)) ?? 'USER';
}

/**
 * Verifica si un rol tiene acceso a /dashboard.
 */
export function canAccessDashboard(role: string): boolean {
  return DASHBOARD_ROLES.includes(normalizeRole(role));
}

/**
 * Verifica si un rol tiene acceso a /admin.
 */
export function canAccessAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(normalizeRole(role));
}

/**
 * Verifica si un rol tiene acceso a reportes.
 */
export function canAccessReports(role: string): boolean {
  return REPORTS_ROLES.includes(normalizeRole(role));
}

/**
 * Etiquetas para mostrar en la UI.
 */
export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  OWNER:       'Propietario',
  ADMIN:       'Administrador',
  MANAGER:     'Gerente',
  CASHIER:     'Cajero',
  EMPLOYEE:    'Empleado',
  USER:        'Usuario',
};

/**
 * Colores de badge para la UI (clases Tailwind).
 */
export const ROLE_BADGE_CLASSES: Record<AppRole, string> = {
  SUPER_ADMIN: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
  OWNER:       'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/30 dark:text-purple-300',
  ADMIN:       'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300',
  MANAGER:     'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300',
  CASHIER:     'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300',
  EMPLOYEE:    'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-300',
  USER:        'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500',
};
