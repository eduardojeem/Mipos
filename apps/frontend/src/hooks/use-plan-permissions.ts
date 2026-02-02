
import { useUserOrganizations } from './use-user-organizations';
import { useAuth } from './use-auth';
import { PLAN_FEATURES, planHasFeature } from '@/config/plans';

export interface PlanPermissions {
  can_access_analytics: boolean;
  can_export_reports: boolean;
  can_manage_team: boolean;
  can_access_admin_panel: boolean;
  can_manage_inventory_advanced: boolean;
  can_use_api: boolean;
  can_have_multiple_branches: boolean;
  can_use_loyalty: boolean;
}

export function usePlanPermissions() {
  const { selectedOrganization } = useUserOrganizations();
  const { user } = useAuth();
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const planName = selectedOrganization?.subscription_plan;

  const check = (feature: string) => {
    if (isSuperAdmin) return true;
    return planHasFeature(planName, feature);
  };

  const permissions: PlanPermissions = {
    can_access_analytics: check(PLAN_FEATURES.ANALYTICS),
    can_export_reports: check(PLAN_FEATURES.EXPORT_REPORTS),
    can_manage_team: check(PLAN_FEATURES.TEAM_MANAGEMENT),
    can_access_admin_panel: check(PLAN_FEATURES.ADMIN_PANEL),
    can_manage_inventory_advanced: check(PLAN_FEATURES.ADVANCED_INVENTORY),
    can_use_api: check(PLAN_FEATURES.API_ACCESS),
    can_have_multiple_branches: check(PLAN_FEATURES.MULTIPLE_BRANCHES),
    can_use_loyalty: check(PLAN_FEATURES.LOYALTY_PROGRAM),
  };

  return {
    permissions,
    canAccessAnalytics: permissions.can_access_analytics,
    canExportReports: permissions.can_export_reports,
    canManageTeam: permissions.can_manage_team,
    canAccessAdminPanel: permissions.can_access_admin_panel,
    canManageInventoryAdvanced: permissions.can_manage_inventory_advanced,
    canUseApi: permissions.can_use_api,
    canHaveMultipleBranches: permissions.can_have_multiple_branches,
    canUseLoyalty: permissions.can_use_loyalty,
  };
}
