
// Plan Types and Features Configuration

export type PlanType = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'PREMIUM' | 'ENTERPRISE';

export const PLAN_FEATURES = {
  ANALYTICS: 'analytics', // Reportes avanzados
  EXPORT_REPORTS: 'export_reports', // Exportar Excel/PDF
  TEAM_MANAGEMENT: 'team_management', // Gestión de usuarios y roles
  ADMIN_PANEL: 'admin_panel', // Panel de administración avanzado
  ADVANCED_INVENTORY: 'advanced_inventory', // Proveedores, Stock bajo, etc.
  API_ACCESS: 'api_access', // Acceso a API
  MULTIPLE_BRANCHES: 'multiple_branches', // Múltiples sucursales
  LOYALTY_PROGRAM: 'loyalty_program', // Programa de lealtad
  UNLIMITED_PRODUCTS: 'unlimited_products', // Productos ilimitados (vs límite)
  CUSTOM_BRANDING: 'custom_branding', // Logo y colores personalizados
} as const;

// Definition of capabilities for each plan
export const PLANS: Record<PlanType, string[]> = {
  FREE: [
    // Basic features only
  ],
  STARTER: [
    PLAN_FEATURES.ANALYTICS, // Basic analytics
    PLAN_FEATURES.TEAM_MANAGEMENT, // Basic team
  ],
  PROFESSIONAL: [
    PLAN_FEATURES.ANALYTICS,
    PLAN_FEATURES.EXPORT_REPORTS,
    PLAN_FEATURES.TEAM_MANAGEMENT,
    PLAN_FEATURES.ADVANCED_INVENTORY,
    PLAN_FEATURES.LOYALTY_PROGRAM,
    PLAN_FEATURES.CUSTOM_BRANDING,
  ],
  PREMIUM: [
    PLAN_FEATURES.ANALYTICS,
    PLAN_FEATURES.EXPORT_REPORTS,
    PLAN_FEATURES.TEAM_MANAGEMENT,
    PLAN_FEATURES.ADMIN_PANEL,
    PLAN_FEATURES.ADVANCED_INVENTORY,
    PLAN_FEATURES.API_ACCESS,
    PLAN_FEATURES.MULTIPLE_BRANCHES,
    PLAN_FEATURES.LOYALTY_PROGRAM,
    PLAN_FEATURES.UNLIMITED_PRODUCTS,
    PLAN_FEATURES.CUSTOM_BRANDING,
  ],
  ENTERPRISE: [
    // Enterprise includes everything from Premium + more exclusive features if any
    PLAN_FEATURES.ANALYTICS,
    PLAN_FEATURES.EXPORT_REPORTS,
    PLAN_FEATURES.TEAM_MANAGEMENT,
    PLAN_FEATURES.ADMIN_PANEL,
    PLAN_FEATURES.ADVANCED_INVENTORY,
    PLAN_FEATURES.API_ACCESS,
    PLAN_FEATURES.MULTIPLE_BRANCHES,
    PLAN_FEATURES.LOYALTY_PROGRAM,
    PLAN_FEATURES.UNLIMITED_PRODUCTS,
    PLAN_FEATURES.CUSTOM_BRANDING,
  ]
};

// Helper to normalize plan names from DB to PlanType
export const normalizePlan = (planName?: string): PlanType => {
  if (!planName) return 'FREE';
  
  const normalized = planName.toUpperCase().trim();
  
  if (normalized === 'PRO' || normalized === 'PROFESSIONAL') return 'PROFESSIONAL';
  if (normalized === 'PREMIUM') return 'PREMIUM';
  if (normalized === 'ENTERPRISE') return 'ENTERPRISE';
  if (normalized === 'STARTER') return 'STARTER';
  
  return 'FREE';
};

// Helper to check if a plan has a specific feature
export const planHasFeature = (planName: string | undefined, feature: string): boolean => {
  const plan = normalizePlan(planName);
  const features = PLANS[plan] || [];
  return features.includes(feature);
};
