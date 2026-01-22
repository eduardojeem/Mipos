'use client';

import React from 'react';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useAuthContext } from '@/hooks/use-auth';
import { 
  User, 
  UserWithRoles, 
  Role, 
  Permission, 
  PermissionContextType,
  USER_ROLES,
  PERMISSION_RESOURCES,
  PERMISSION_ACTIONS,
  SupabaseUser
} from '@/types/auth';

// Unified Permissions Context
const UnifiedPermissionsContext = createContext<PermissionContextType | null>(null);

// Main hook for permissions management
export function useUnifiedPermissions(): PermissionContextType {
  const [user, setUser] = useState<UserWithRoles | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user: authUser } = useAuthContext();

  // Load user permissions and roles
  const loadUserPermissions = useCallback(async () => {
    if (!authUser) {
      setUser(null);
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Helper to normalize role names to our constants
      const normalizeRole = (r?: string) => {
        const key = (r || '').toUpperCase();
        if (key === 'SUPER_ADMIN' || key === 'OWNER') return USER_ROLES.SUPER_ADMIN;
        if (key === 'ADMIN') return USER_ROLES.ADMIN;
        if (key === 'MANAGER') return USER_ROLES.MANAGER;
        if (key === 'CASHIER') return USER_ROLES.CASHIER;
        if (key === 'EMPLOYEE') return USER_ROLES.EMPLOYEE;
        return USER_ROLES.USER;
      };

      // Fetch profile from backend (centralized RLS and fallback)
      let profileUser: User | null = null;
      try {
        const profileResp = await fetch('/api/auth/profile', { cache: 'no-store' });
        if (profileResp.ok) {
          const profileJson = (await profileResp.json()) as { success: boolean; data?: User };
          if (profileJson.success && profileJson.data) {
            profileUser = profileJson.data;
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      // Fallback to auth-based user
      if (!profileUser) {
        profileUser = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.email?.split('@')[0] || 'Usuario',
          role: normalizeRole((authUser as any)?.role || (authUser as any)?.app_metadata?.role || (authUser as any)?.user_metadata?.role || 'USER'),
          status: 'active',
          createdAt: (authUser as SupabaseUser).created_at || new Date().toISOString(),
          updatedAt: (authUser as SupabaseUser).updated_at || (authUser as SupabaseUser).created_at,
          lastLogin: (authUser as SupabaseUser).last_sign_in_at,
          avatar: (authUser as SupabaseUser).user_metadata?.avatar_url || '',
          phone: (authUser as SupabaseUser).user_metadata?.phone || ''
        };
      } else {
        profileUser.role = normalizeRole(profileUser.role);
      }

      // Derive roles array from normalized role
      const derivedRoles: Role[] = [
        {
          id: profileUser.role,
          name: profileUser.role,
          isSystemRole: false,
          isActive: true,
          createdAt: profileUser.createdAt,
          updatedAt: profileUser.updatedAt
        }
      ];

      // Fetch permissions via backend route
      const fetchedPermissions: Permission[] = [];
      try {
        const permResp = await fetch(`/api/users/${profileUser.id}/permissions`, { cache: 'no-store' });
        if (permResp.ok) {
          const permJson = (await permResp.json()) as { success: boolean; permissions?: Array<{ id: string; name?: string; resource?: string; action?: string }> };
          if (permJson.success && Array.isArray(permJson.permissions)) {
            const mapped = permJson.permissions.map(p => ({
              id: String(p.id),
              name: p.name || `${p.resource}:${p.action}`,
              resource: p.resource || '',
              action: p.action || '',
              isActive: true,
              createdAt: profileUser!.createdAt,
              updatedAt: profileUser!.updatedAt
            }));
            fetchedPermissions.push(...mapped);
          }
        }
      } catch (e) {
        // keep empty permissions on error
      }

      const userWithRoles: UserWithRoles = {
        ...profileUser,
        roles: derivedRoles,
        permissions: fetchedPermissions
      } as UserWithRoles;

      setUser(userWithRoles);
      setRoles(derivedRoles);
      setPermissions(fetchedPermissions);

      // Computed flags
      // These will be also exposed via context selectors
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError(err instanceof Error ? err.message : 'Error loading permissions');

      // Minimal fallback
      const fallbackUser: UserWithRoles = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.email?.split('@')[0] || 'Usuario',
        role: USER_ROLES.USER,
        status: 'active',
        createdAt: (authUser as SupabaseUser).created_at || new Date().toISOString(),
        roles: [
          {
            id: USER_ROLES.USER,
            name: USER_ROLES.USER,
            isSystemRole: false,
            isActive: true,
            createdAt: (authUser as SupabaseUser).created_at || new Date().toISOString(),
            updatedAt: (authUser as SupabaseUser).updated_at || (authUser as SupabaseUser).created_at
          }
        ],
        permissions: []
      };
      setUser(fallbackUser);
      setRoles(fallbackUser.roles);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  // Load permissions on auth user change
  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  // Permission checking functions
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.roles.some(role => role.name === USER_ROLES.SUPER_ADMIN)) {
      return true;
    }
    
    // Admin has most permissions (except super admin specific ones)
    if (user.roles.some(role => role.name === USER_ROLES.ADMIN)) {
      // Restrict some super admin only actions
      if (resource === PERMISSION_RESOURCES.SYSTEM && action === PERMISSION_ACTIONS.MANAGE) {
        return false;
      }
      return true;
    }
    
    // Check specific permissions
    return user.permissions.some(permission => 
      permission.resource === resource && permission.action === action
    );
  }, [user]);

  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!user) return false;
    
    return permissionList.some(permission => {
      const [resource, action] = permission.split('.');
      return hasPermission(resource, action);
    });
  }, [user, hasPermission]);

  const hasAllPermissions = useCallback((permissionList: string[]): boolean => {
    if (!user) return false;
    
    return permissionList.every(permission => {
      const [resource, action] = permission.split('.');
      return hasPermission(resource, action);
    });
  }, [user, hasPermission]);

  const hasRole = useCallback((roleName: string): boolean => {
    if (!user) return false;
    return user.roles.some(role => role.name === roleName);
  }, [user]);

  const hasAnyRole = useCallback((roleList: string[]): boolean => {
    if (!user) return false;
    return roleList.some(roleName => hasRole(roleName));
  }, [user, hasRole]);

  // Computed properties
  const isAdmin = hasRole(USER_ROLES.ADMIN) || hasRole(USER_ROLES.SUPER_ADMIN);
  const isSuperAdmin = hasRole(USER_ROLES.SUPER_ADMIN);
  const isManager = hasRole(USER_ROLES.MANAGER);
  const isCashier = hasRole(USER_ROLES.CASHIER);

  return {
    user,
    loading,
    error,
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    isManager,
    isCashier,
    refreshPermissions: loadUserPermissions
  };
}

// Provider component
export function UnifiedPermissionsProvider({ children }: { children: React.ReactNode }) {
  const permissions = useUnifiedPermissions();
  
  return (
    <UnifiedPermissionsContext.Provider value={permissions}>
      {children}
    </UnifiedPermissionsContext.Provider>
  );
}

// Hook to use the unified permissions context
export function usePermissionsContext(): PermissionContextType {
  const context = useContext(UnifiedPermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext must be used within a UnifiedPermissionsProvider');
  }
  return context;
}

// Convenience hooks
export function useHasPermission(resource: string, action: string) {
  const { hasPermission, loading } = usePermissionsContext();
  return { hasPermission: hasPermission(resource, action), loading };
}

export function useHasRole(role: string) {
  const { hasRole, loading } = usePermissionsContext();
  return { hasRole: hasRole(role), loading };
}

export function useIsAdmin() {
  const { isAdmin, loading } = usePermissionsContext();
  return { isAdmin, loading };
}

export function useIsSuperAdmin() {
  const { isSuperAdmin, loading } = usePermissionsContext();
  return { isSuperAdmin, loading };
}

export function useIsManager() {
  const { isManager, loading } = usePermissionsContext();
  return { isManager, loading };
}

export function useIsCashier() {
  const { isCashier, loading } = usePermissionsContext();
  return { isCashier, loading };
}