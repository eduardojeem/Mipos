import { normalizePlanCode } from '@/lib/plan-catalog';

export type PlanType = 'FREE' | 'STARTER' | 'PROFESSIONAL';

export const PLAN_FEATURES = {
  BASIC_INVENTORY: 'basic_inventory',
  BASIC_SALES: 'basic_sales',
  PURCHASE_MODULE: 'purchase_module',
  BASIC_REPORTS: 'basic_reports',
  ADVANCED_REPORTS: 'advanced_reports',
  MULTI_BRANCH: 'multi_branch',
  AUDIT_LOGS: 'audit_logs',
  UNLIMITED_USERS: 'unlimited_users',
  ANALYTICS: 'basic_reports',
  EXPORT_REPORTS: 'export_reports',
  TEAM_MANAGEMENT: 'team_management',
  ADMIN_PANEL: 'admin_panel',
  ADVANCED_INVENTORY: 'advanced_inventory',
  API_ACCESS: 'api_access',
  MULTIPLE_BRANCHES: 'multi_branch',
  LOYALTY_PROGRAM: 'loyalty_program',
  UNLIMITED_PRODUCTS: 'unlimited_products',
  CUSTOM_BRANDING: 'custom_branding',
} as const;

export const PLANS: Record<PlanType, string[]> = {
  FREE: [
    PLAN_FEATURES.BASIC_INVENTORY,
    PLAN_FEATURES.BASIC_SALES,
    PLAN_FEATURES.ADMIN_PANEL,
  ],
  STARTER: [
    PLAN_FEATURES.BASIC_INVENTORY,
    PLAN_FEATURES.BASIC_SALES,
    PLAN_FEATURES.PURCHASE_MODULE,
    PLAN_FEATURES.BASIC_REPORTS,
    PLAN_FEATURES.TEAM_MANAGEMENT,
    PLAN_FEATURES.ADMIN_PANEL,
    PLAN_FEATURES.ADVANCED_INVENTORY,
  ],
  PROFESSIONAL: [
    PLAN_FEATURES.BASIC_INVENTORY,
    PLAN_FEATURES.BASIC_SALES,
    PLAN_FEATURES.PURCHASE_MODULE,
    PLAN_FEATURES.BASIC_REPORTS,
    PLAN_FEATURES.ADVANCED_REPORTS,
    PLAN_FEATURES.MULTI_BRANCH,
    PLAN_FEATURES.AUDIT_LOGS,
    PLAN_FEATURES.UNLIMITED_USERS,
    PLAN_FEATURES.EXPORT_REPORTS,
    PLAN_FEATURES.TEAM_MANAGEMENT,
    PLAN_FEATURES.ADMIN_PANEL,
    PLAN_FEATURES.ADVANCED_INVENTORY,
    PLAN_FEATURES.LOYALTY_PROGRAM,
    PLAN_FEATURES.CUSTOM_BRANDING,
  ],
};

export const normalizePlan = (planName?: string): PlanType => {
  return normalizePlanCode(planName);
};

export const planHasFeature = (planName: string | undefined, feature: string): boolean => {
  const plan = normalizePlan(planName);
  const features = PLANS[plan] || [];
  return features.includes(feature);
};
