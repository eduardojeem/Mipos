import type { Permission, Role } from '@/types/auth';

const PRODUCT_CREATE_ACTIONS = new Set(['create', 'write', 'manage']);
const PRODUCT_EDIT_ACTIONS = new Set(['edit', 'update', 'write', 'manage']);
const PRODUCT_DELETE_ACTIONS = new Set(['delete', 'remove', 'write', 'manage']);
const PRODUCT_MANAGER_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'ADMIN']);

function normalizeRoleName(role?: string | null) {
  return String(role || '').trim().toUpperCase().replace(/-/g, '_');
}

function normalizeAction(action?: string | null) {
  return String(action || '').trim().toLowerCase();
}

function isProductPermission(
  permission: Pick<Permission, 'resource' | 'action'>,
  allowedActions: Set<string>
) {
  return (
    String(permission.resource || '').trim().toLowerCase() === 'products' &&
    allowedActions.has(normalizeAction(permission.action))
  );
}

function hasAdminProductRole(roles: Array<Pick<Role, 'name'> | string>) {
  return roles.some((role) => {
    const roleName = typeof role === 'string' ? role : role.name;
    return PRODUCT_MANAGER_ROLES.has(normalizeRoleName(roleName));
  });
}

function canManageProducts(options: {
  permissions?: Array<Pick<Permission, 'resource' | 'action'>>;
  roles?: Array<Pick<Role, 'name'> | string>;
  hasPermission?: (resource: string, action: string) => boolean;
}, actions: Set<string>) {
  const { permissions = [], roles = [], hasPermission } = options;

  if (
    Array.from(actions).some((action) => hasPermission?.('products', action))
  ) {
    return true;
  }

  if (permissions.some((permission) => isProductPermission(permission, actions))) {
    return true;
  }

  return hasAdminProductRole(roles);
}

export function canCreateProducts(options: {
  permissions?: Array<Pick<Permission, 'resource' | 'action'>>;
  roles?: Array<Pick<Role, 'name'> | string>;
  hasPermission?: (resource: string, action: string) => boolean;
}) {
  return canManageProducts(options, PRODUCT_CREATE_ACTIONS);
}

export function canEditProducts(options: {
  permissions?: Array<Pick<Permission, 'resource' | 'action'>>;
  roles?: Array<Pick<Role, 'name'> | string>;
  hasPermission?: (resource: string, action: string) => boolean;
}) {
  return canManageProducts(options, PRODUCT_EDIT_ACTIONS);
}

export function canDeleteProducts(options: {
  permissions?: Array<Pick<Permission, 'resource' | 'action'>>;
  roles?: Array<Pick<Role, 'name'> | string>;
  hasPermission?: (resource: string, action: string) => boolean;
}) {
  return canManageProducts(options, PRODUCT_DELETE_ACTIONS);
}
