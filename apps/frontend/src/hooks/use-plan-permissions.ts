
import { useUserOrganizations } from './use-user-organizations';

export interface PlanPermissions {
  can_access_analytics: boolean;
  can_export_reports: boolean;
  can_manage_team: boolean;
  can_access_admin_panel: boolean;
  can_manage_inventory_advanced: boolean;
}

const DEFAULT_PERMISSIONS: PlanPermissions = {
  can_access_analytics: false,
  can_export_reports: false,
  can_manage_team: false,
  can_access_admin_panel: false,
  can_manage_inventory_advanced: false
};

export function usePlanPermissions() {
  const { selectedOrganization } = useUserOrganizations();
  
  const permissions: PlanPermissions = (selectedOrganization?.settings as any)?.permissions || DEFAULT_PERMISSIONS;

  return {
    permissions,
    canAccessAnalytics: permissions.can_access_analytics,
    canExportReports: permissions.can_export_reports,
    canManageTeam: permissions.can_manage_team,
    canAccessAdminPanel: permissions.can_access_admin_panel,
    canManageInventoryAdvanced: permissions.can_manage_inventory_advanced,
  };
}
