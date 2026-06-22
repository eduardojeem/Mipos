'use client';

import type { PlanPermissions } from '@/hooks/use-plan-permissions';

type DashboardNavItem = {
  href: string;
  roles?: string[];
  category?: string;
  /** Si está definido, el ítem solo se muestra para estos verticales. Sin definir = todos. */
  verticals?: string[];
};

export function canRoleAccessDashboardItem(
  item: DashboardNavItem,
  userRole?: string | null
) {
  if (!item.roles?.length) return true;
  const role = userRole || 'CASHIER';
  return item.roles.includes(role) || (role === 'SUPER_ADMIN' && item.roles.includes('ADMIN'));
}

export function canPlanAccessDashboardHref(
  href: string,
  category: string | undefined,
  permissions: PlanPermissions,
  isPlanResolved: boolean,
  userRole?: string | null
) {
  if (!isPlanResolved) return true;
  if (userRole === 'SUPER_ADMIN') return true;
  if (href === '/dashboard/reports' && !permissions.can_access_analytics) return false;
  if (category === 'admin' && !permissions.can_access_admin_panel) return false;
  return true;
}

export function canAccessDashboardItem(
  item: DashboardNavItem,
  options: {
    userRole?: string | null;
    permissions: PlanPermissions;
    isPlanResolved: boolean;
    vertical?: string | null;
  }
) {
  // Gating por vertical: ítems con `verticals` solo aparecen en esos rubros
  // (ej: Proveedores/Pedidos Web/Devoluciones solo en RETAIL, no en barbería).
  if (item.verticals && options.vertical && !item.verticals.includes(options.vertical)) {
    return false;
  }
  return (
    canRoleAccessDashboardItem(item, options.userRole) &&
    canPlanAccessDashboardHref(
      item.href,
      item.category,
      options.permissions,
      options.isPlanResolved,
      options.userRole
    )
  );
}

export function filterDashboardNavigation<T extends DashboardNavItem>(
  items: T[],
  options: {
    userRole?: string | null;
    permissions: PlanPermissions;
    isPlanResolved: boolean;
    vertical?: string | null;
  }
) {
  return items.filter((item) => canAccessDashboardItem(item, options));
}

export function canAccessAdminSettings(
  userRole: string | null | undefined,
  permissions: PlanPermissions,
  isPlanResolved: boolean
) {
  if (!userRole) return false;
  if (!['OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) return false;
  return canPlanAccessDashboardHref('/admin/settings', 'admin', permissions, isPlanResolved, userRole);
}
