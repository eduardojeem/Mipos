import { CANONICAL_PLAN_FEATURES, normalizePlanCode } from '@/lib/plan-catalog';

export type PlanType = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export const PLAN_FEATURES = {
  BASIC_INVENTORY: 'basic_inventory',
  BASIC_SALES: 'basic_sales',
  PUBLIC_CATALOG: 'public_catalog',
  ONLINE_ORDERS: 'online_orders',
  MARKETPLACE_PUBLIC: 'marketplace_public',
  SERVICES_CATALOG: 'services_catalog',
  APPOINTMENTS: 'appointments',
  STAFF_MANAGEMENT: 'staff_management',
  PUBLIC_BOOKING: 'public_booking',
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
  FREE: CANONICAL_PLAN_FEATURES.free,
  STARTER: CANONICAL_PLAN_FEATURES.starter,
  PROFESSIONAL: CANONICAL_PLAN_FEATURES.professional,
  ENTERPRISE: CANONICAL_PLAN_FEATURES.enterprise,
};

export const normalizePlan = (planName?: string): PlanType => {
  return normalizePlanCode(planName);
};

export const planHasFeature = (planName: string | undefined, feature: string): boolean => {
  const plan = normalizePlan(planName);
  const features = PLANS[plan] || [];
  return features.includes(feature);
};
