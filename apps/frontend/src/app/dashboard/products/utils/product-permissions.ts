import type { Permission, Role } from '@/types/auth';

const PRODUCT_CREATE_ACTIONS = new Set(['create', 'write', 'manage']);
const PRODUCT_MANAGER_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'ADMIN']);

function normalizeRoleName(role?: string | null) {
  return String(role || '').trim().toUpperCase().replace(/-/g, '_');
}

function normalizeAction(action?: string | null) {
  return String(action || '').trim().toLowerCase();
}

function isProductCreatePermission(permission: Pick<Permission, 'resource' | 'action'>) {
  return (
    String(permission.resource || '').trim().toLowerCase() === 'products' &&
    PRODUCT_CREATE_ACTIONS.has(normalizeAction(permission.action))
  );
}

export function canCreateProducts(options: {
  permissions?: Array<Pick<Permission, 'resource' | 'action'>>;
  roles?: Array<Pick<Role, 'name'> | string>;
  hasPermission?: (resource: string, action: string) => boolean;
}) {
  const { permissions = [], roles = [], hasPermission } = options;

  if (
    hasPermission?.('products', 'create') ||
    hasPermission?.('products', 'write') ||
    hasPermission?.('products', 'manage')
  ) {
    return true;
  }

  if (permissions.some(isProductCreatePermission)) {
    return true;
  }

  return roles.some((role) => {
    const roleName = typeof role === 'string' ? role : role.name;
    return PRODUCT_MANAGER_ROLES.has(normalizeRoleName(roleName));
  });
}
