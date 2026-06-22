import { PLAN_FEATURES, planHasFeature } from '@/config/plans'

export const ACCESS_SECTIONS = {
  DASHBOARD: 'dashboard',
  REPORTS: 'reports',
  ADMIN_PANEL: 'admin_panel',
  BUSINESS_CONFIG_CONTENT: 'business_config_content',
  BUSINESS_CONFIG_BRANDING: 'business_config_branding',
  BUSINESS_CONFIG_COMMERCE: 'business_config_commerce',
  BUSINESS_CONFIG_PUBLICATION: 'business_config_publication',
} as const

export type AccessSection = typeof ACCESS_SECTIONS[keyof typeof ACCESS_SECTIONS]

export interface AccessSectionInfo {
  section: AccessSection
  label: string
  requiredPlan: 'free' | 'starter' | 'professional' | 'enterprise'
  requiredFeature: string
}

export const BUSINESS_CONFIG_ACCESS: Record<AccessSection, AccessSectionInfo | null> = {
  [ACCESS_SECTIONS.DASHBOARD]: null,
  [ACCESS_SECTIONS.REPORTS]: null,
  [ACCESS_SECTIONS.ADMIN_PANEL]: null,
  [ACCESS_SECTIONS.BUSINESS_CONFIG_CONTENT]: {
    section: ACCESS_SECTIONS.BUSINESS_CONFIG_CONTENT,
    label: 'Contenido de la web',
    requiredPlan: 'free',
    requiredFeature: PLAN_FEATURES.PUBLIC_CATALOG,
  },
  [ACCESS_SECTIONS.BUSINESS_CONFIG_BRANDING]: {
    section: ACCESS_SECTIONS.BUSINESS_CONFIG_BRANDING,
    label: 'Marca personalizada',
    requiredPlan: 'starter',
    requiredFeature: PLAN_FEATURES.CUSTOM_BRANDING,
  },
  [ACCESS_SECTIONS.BUSINESS_CONFIG_COMMERCE]: {
    section: ACCESS_SECTIONS.BUSINESS_CONFIG_COMMERCE,
    label: 'Configuración comercial',
    requiredPlan: 'starter',
    requiredFeature: PLAN_FEATURES.ONLINE_ORDERS,
  },
  [ACCESS_SECTIONS.BUSINESS_CONFIG_PUBLICATION]: {
    section: ACCESS_SECTIONS.BUSINESS_CONFIG_PUBLICATION,
    label: 'Publicación y dominio',
    requiredPlan: 'professional',
    requiredFeature: PLAN_FEATURES.CUSTOM_BRANDING,
  },
}

export function canPlanAccessSection(planName: string | undefined, section: AccessSection): boolean {
  switch (section) {
    case ACCESS_SECTIONS.DASHBOARD:
      return planHasFeature(planName, PLAN_FEATURES.BASIC_INVENTORY) || planHasFeature(planName, PLAN_FEATURES.BASIC_SALES)
    case ACCESS_SECTIONS.REPORTS:
      return planHasFeature(planName, PLAN_FEATURES.BASIC_REPORTS)
    case ACCESS_SECTIONS.ADMIN_PANEL:
      return planHasFeature(planName, PLAN_FEATURES.ADMIN_PANEL)
    case ACCESS_SECTIONS.BUSINESS_CONFIG_CONTENT:
      return planHasFeature(planName, PLAN_FEATURES.PUBLIC_CATALOG)
    case ACCESS_SECTIONS.BUSINESS_CONFIG_BRANDING:
      return planHasFeature(planName, PLAN_FEATURES.CUSTOM_BRANDING)
    case ACCESS_SECTIONS.BUSINESS_CONFIG_COMMERCE:
      return planHasFeature(planName, PLAN_FEATURES.ONLINE_ORDERS)
    case ACCESS_SECTIONS.BUSINESS_CONFIG_PUBLICATION:
      return planHasFeature(planName, PLAN_FEATURES.CUSTOM_BRANDING)
    default:
      return false
  }
}

export function getAccessSectionInfo(section: AccessSection): AccessSectionInfo | null {
  return BUSINESS_CONFIG_ACCESS[section] || null
}
