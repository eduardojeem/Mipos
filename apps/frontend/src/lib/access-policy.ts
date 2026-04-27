import { PLAN_FEATURES, planHasFeature } from '@/config/plans'

export const ACCESS_SECTIONS = {
  DASHBOARD: 'dashboard',
  REPORTS: 'reports',
  ADMIN_PANEL: 'admin_panel',
} as const

export type AccessSection = typeof ACCESS_SECTIONS[keyof typeof ACCESS_SECTIONS]

export function canPlanAccessSection(planName: string | undefined, section: AccessSection): boolean {
  switch (section) {
    case ACCESS_SECTIONS.DASHBOARD:
      return planHasFeature(planName, PLAN_FEATURES.BASIC_INVENTORY) || planHasFeature(planName, PLAN_FEATURES.BASIC_SALES)
    case ACCESS_SECTIONS.REPORTS:
      return planHasFeature(planName, PLAN_FEATURES.BASIC_REPORTS)
    case ACCESS_SECTIONS.ADMIN_PANEL:
      return planHasFeature(planName, PLAN_FEATURES.ADMIN_PANEL)
    default:
      return false
  }
}
