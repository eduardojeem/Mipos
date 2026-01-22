import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeaders, isDevMockMode, verifySupabaseToken, buildMockUserFromHeaders, mapSupabaseUserToAuth, getSupabaseClient } from '../config/supabase';
import { createError } from './errorHandler';
import { RoleManager } from '../lib/auth/role-manager';
import { securityLogger, SecurityEventType } from './security-logger';
import { UserRole_New } from '@prisma/client';
import { prisma } from '../index';

export interface EnhancedAuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
    roles: Array<{
      id: number;
      name: string;
      permissions: Array<{
        id: number;
        name: string;
        resource: string;
        action: string;
      }>;
    }>;
    permissions: Array<{
      id: number;
      name: string;
      resource: string;
      action: string;
    }>;
  };
}

export {
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireAnyRole,
  requireUserManagement,
  requireProductManagement,
  requireSalesAccess,
  requireReportsAccess,
  requireSystemConfig,
  requireAdmin,
  requireManager,
  requireCashier,
  requireAdminOrManager,
  requireAdminOrCashier,
  hasPermission,
  hasRole,
} from './auth-helpers';

/**
 * Enhanced authentication middleware that loads complete user roles and permissions
 */
export const enhancedAuthMiddleware = async (
  req: EnhancedAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractTokenFromHeaders(req);

    if (!token) {
      if (isDevMockMode()) {
        console.log('🔧 Enhanced Auth: Sin token, modo dev activo, usuario mock');
        const mock = buildMockUserFromHeaders(req);

        const mockPermissions = [
          { id: -1, name: 'products:read', resource: 'products', action: 'read' },
          { id: -2, name: 'products:create', resource: 'products', action: 'create' },
          { id: -3, name: 'products:update', resource: 'products', action: 'update' },
          { id: -4, name: 'products:delete', resource: 'products', action: 'delete' },
          { id: -5, name: 'categories:read', resource: 'categories', action: 'read' },
          { id: -6, name: 'categories:create', resource: 'categories', action: 'create' },
          { id: -7, name: 'categories:update', resource: 'categories', action: 'update' },
          { id: -8, name: 'categories:delete', resource: 'categories', action: 'delete' },
          { id: -9, name: 'customers:read', resource: 'customers', action: 'read' },
          { id: -10, name: 'customers:create', resource: 'customers', action: 'create' },
          { id: -11, name: 'customers:update', resource: 'customers', action: 'update' },
          { id: -12, name: 'customers:delete', resource: 'customers', action: 'delete' },
          { id: -13, name: 'sales:read', resource: 'sales', action: 'read' },
          { id: -14, name: 'sales:create', resource: 'sales', action: 'create' },
          { id: -15, name: 'sales:update', resource: 'sales', action: 'update' },
          { id: -16, name: 'sales:delete', resource: 'sales', action: 'delete' },
          { id: -17, name: 'inventory:read', resource: 'inventory', action: 'read' },
          { id: -18, name: 'inventory:update', resource: 'inventory', action: 'update' },
          { id: -19, name: 'reports:view', resource: 'reports', action: 'view' },
          { id: -20, name: 'users:read', resource: 'users', action: 'read' },
          { id: -21, name: 'users:create', resource: 'users', action: 'create' },
          { id: -22, name: 'users:update', resource: 'users', action: 'update' },
          { id: -23, name: 'users:delete', resource: 'users', action: 'delete' },
          { id: -24, name: 'dashboard:read', resource: 'dashboard', action: 'read' },
          { id: -25, name: 'cash:read', resource: 'cash', action: 'read' },
          { id: -26, name: 'cash:open', resource: 'cash', action: 'open' },
          { id: -27, name: 'cash:close', resource: 'cash', action: 'close' },
          { id: -28, name: 'cash:move', resource: 'cash', action: 'move' },
          { id: -29, name: 'cash:reconcile', resource: 'cash', action: 'reconcile' }
        ];

        req.user = {
          id: mock.id,
          email: mock.email,
          fullName: 'Administrador Mock',
          roles: [
            {
              id: 0,
              name: 'ADMINISTRADOR',
              permissions: mockPermissions
            }
          ],
          permissions: mockPermissions
        };
        return next();
      }
      return res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    // MODO DESARROLLO: Usar autenticación mock si Supabase falla
    const isDevelopment = isDevMockMode();

    if (isDevelopment && token === 'mock-token') {
      console.log('🔧 Enhanced Auth: Usando autenticación mock para desarrollo');
      const mockPermissions = [
        { id: -1, name: 'products:read', resource: 'products', action: 'read' },
        { id: -2, name: 'products:create', resource: 'products', action: 'create' },
        { id: -3, name: 'products:update', resource: 'products', action: 'update' },
        { id: -4, name: 'products:delete', resource: 'products', action: 'delete' },
        { id: -5, name: 'categories:read', resource: 'categories', action: 'read' },
        { id: -6, name: 'categories:create', resource: 'categories', action: 'create' },
        { id: -7, name: 'categories:update', resource: 'categories', action: 'update' },
        { id: -8, name: 'categories:delete', resource: 'categories', action: 'delete' },
        { id: -9, name: 'customers:read', resource: 'customers', action: 'read' },
        { id: -10, name: 'customers:create', resource: 'customers', action: 'create' },
        { id: -11, name: 'customers:update', resource: 'customers', action: 'update' },
        { id: -12, name: 'customers:delete', resource: 'customers', action: 'delete' },
        { id: -13, name: 'sales:read', resource: 'sales', action: 'read' },
        { id: -14, name: 'sales:create', resource: 'sales', action: 'create' },
        { id: -15, name: 'sales:update', resource: 'sales', action: 'update' },
        { id: -16, name: 'sales:delete', resource: 'sales', action: 'delete' },
        { id: -17, name: 'inventory:read', resource: 'inventory', action: 'read' },
        { id: -18, name: 'inventory:update', resource: 'inventory', action: 'update' },
        { id: -19, name: 'reports:view', resource: 'reports', action: 'view' },
        { id: -20, name: 'users:read', resource: 'users', action: 'read' },
        { id: -21, name: 'users:create', resource: 'users', action: 'create' },
        { id: -22, name: 'users:update', resource: 'users', action: 'update' },
        { id: -23, name: 'users:delete', resource: 'users', action: 'delete' },
        { id: -24, name: 'dashboard:read', resource: 'dashboard', action: 'read' },
        { id: -25, name: 'cash:read', resource: 'cash', action: 'read' },
        { id: -26, name: 'cash:open', resource: 'cash', action: 'open' },
        { id: -27, name: 'cash:close', resource: 'cash', action: 'close' },
        { id: -28, name: 'cash:move', resource: 'cash', action: 'move' },
        { id: -29, name: 'cash:reconcile', resource: 'cash', action: 'reconcile' }
      ];
      req.user = {
        id: 'mock-user-id',
        email: 'admin@cosmeticos.com',
        fullName: 'Administrador Mock',
        roles: [
          {
            id: 0,
            name: 'ADMINISTRADOR',
            permissions: mockPermissions
          }
        ],
        permissions: mockPermissions
      };
      console.log('✅ Enhanced Auth: Usuario mock autenticado');
      return next();
    }

    // Verify token with Supabase
    const { user, error } = await verifySupabaseToken(token);

    if (error || !user) {
      // En desarrollo, permitir acceso con usuario mock como fallback
      if (isDevelopment) {
        console.log('🔧 Enhanced Auth: Supabase falló, usando usuario mock como fallback');
        const mock = buildMockUserFromHeaders(req);
        const mockPermissions = [
          { id: -1, name: 'products:read', resource: 'products', action: 'read' },
          { id: -2, name: 'products:create', resource: 'products', action: 'create' },
          { id: -3, name: 'products:update', resource: 'products', action: 'update' },
          { id: -4, name: 'products:delete', resource: 'products', action: 'delete' },
          { id: -5, name: 'categories:read', resource: 'categories', action: 'read' },
          { id: -6, name: 'categories:create', resource: 'categories', action: 'create' },
          { id: -7, name: 'categories:update', resource: 'categories', action: 'update' },
          { id: -8, name: 'categories:delete', resource: 'categories', action: 'delete' },
          { id: -9, name: 'customers:read', resource: 'customers', action: 'read' },
          { id: -10, name: 'customers:create', resource: 'customers', action: 'create' },
          { id: -11, name: 'customers:update', resource: 'customers', action: 'update' },
          { id: -12, name: 'customers:delete', resource: 'customers', action: 'delete' },
          { id: -13, name: 'sales:read', resource: 'sales', action: 'read' },
          { id: -14, name: 'sales:create', resource: 'sales', action: 'create' },
          { id: -15, name: 'sales:update', resource: 'sales', action: 'update' },
          { id: -16, name: 'sales:delete', resource: 'sales', action: 'delete' },
          { id: -17, name: 'inventory:read', resource: 'inventory', action: 'read' },
          { id: -18, name: 'inventory:update', resource: 'inventory', action: 'update' },
          { id: -19, name: 'reports:view', resource: 'reports', action: 'view' },
          { id: -20, name: 'users:read', resource: 'users', action: 'read' },
          { id: -21, name: 'users:create', resource: 'users', action: 'create' },
          { id: -22, name: 'users:update', resource: 'users', action: 'update' },
          { id: -23, name: 'users:delete', resource: 'users', action: 'delete' },
          { id: -24, name: 'dashboard:read', resource: 'dashboard', action: 'read' },
          { id: -25, name: 'cash:read', resource: 'cash', action: 'read' },
          { id: -26, name: 'cash:open', resource: 'cash', action: 'open' },
          { id: -27, name: 'cash:close', resource: 'cash', action: 'close' },
          { id: -28, name: 'cash:move', resource: 'cash', action: 'move' },
          { id: -29, name: 'cash:reconcile', resource: 'cash', action: 'reconcile' }
        ];
        req.user = {
          id: mock.id,
          email: mock.email,
          fullName: 'Usuario Fallback',
          roles: [
            {
              id: 0,
              name: 'ADMINISTRADOR',
              permissions: mockPermissions
            }
          ],
          permissions: mockPermissions
        };
        console.log('✅ Enhanced Auth: Usuario fallback autenticado');
        return next();
      }

      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Get complete user data with roles and permissions from Supabase
    console.log('🔍 Enhanced Auth: Consultando roles y permisos para usuario:', user.id);

    // Cargar roles/permisos reales desde Supabase; fallback seguro si no hay datos
    const supabase = getSupabaseClient();
    let transformedRoles: Array<{ id: string; name: string; permissions: Array<{ id: string; name: string; resource: string; action: string }> }> = [];
    let finalPermissions: Array<{ id: string; name: string; resource: string; action: string }> = [];

    if (supabase) {
      try {
        const nowIso = new Date().toISOString();
        const { data: userRoles, error: urError } = await supabase
          .from('user_roles')
          .select('id, role_id, is_active, expires_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

        if (!urError && Array.isArray(userRoles) && userRoles.length > 0) {
          const roleIds = Array.from(new Set(userRoles.map((r: any) => r.role_id).filter(Boolean)));

          const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('id, name, display_name, is_active')
            .in('id', roleIds)
            .eq('is_active', true);

          const { data: rolePerms, error: rpError } = await supabase
            .from('role_permissions')
            .select('role_id, permission_id')
            .in('role_id', roleIds);

          const permIds = Array.from(new Set((rolePerms || []).map((rp: any) => rp.permission_id).filter(Boolean)));

          const { data: perms, error: permsError } = await supabase
            .from('permissions')
            .select('id, name, resource, action, display_name, is_active')
            .in('id', permIds)
            .eq('is_active', true);

          if (!rolesError && !rpError && !permsError) {
            const permsById = new Map<string, any>();
            (perms || []).forEach((p: any) => permsById.set(p.id, p));

            const permIdsByRole = new Map<string, string[]>();
            (rolePerms || []).forEach((rp: any) => {
              const list = permIdsByRole.get(rp.role_id) || [];
              list.push(rp.permission_id);
              permIdsByRole.set(rp.role_id, list);
            });

            transformedRoles = (roles || []).map((role: any) => {
              const pids = permIdsByRole.get(role.id) || [];
              const rolePermissions = pids
                .map(pid => permsById.get(pid))
                .filter(Boolean)
                .map((p: any) => ({ id: p.id, name: p.name, resource: p.resource, action: p.action }));
              return {
                id: role.id,
                name: role.name || role.display_name || 'ROLE',
                permissions: rolePermissions
              };
            });

            const map = new Map<string, any>();
            transformedRoles.forEach(r => {
              r.permissions.forEach((p: any) => {
                map.set(p.id, p);
              });
            });
            finalPermissions = Array.from(map.values());
          }
        }
        const mappedUser = mapSupabaseUserToAuth(user);
        req.user = {
          id: mappedUser.id,
          email: mappedUser.email || '',
          fullName: mappedUser.fullName || mappedUser.email || 'Usuario',
          roles: transformedRoles as any,
          permissions: finalPermissions as any
        } as any;

        return next();
      } catch (error) {
        console.error('Enhanced auth middleware error:', error);
        return res.status(500).json({
          error: 'Authentication failed',
          code: 'AUTH_ERROR'
        });
      }
    }

    const mappedUser = mapSupabaseUserToAuth(user);
    if (!req.user) {
      req.user = {
        id: mappedUser.id,
        email: mappedUser.email || '',
        fullName: mappedUser.fullName || mappedUser.email || 'Usuario',
        roles: transformedRoles as any,
        permissions: finalPermissions as any
      } as any;
    }
    return next();
  } catch (error) {
    console.error('Enhanced auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};
