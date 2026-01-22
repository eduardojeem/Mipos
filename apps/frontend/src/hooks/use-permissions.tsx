'use client';

import { useEffect, createContext, useContext, useRef } from 'react';
import { useAuthContext } from './use-auth';
import { 
  usePermissionsContext as useUnifiedPermissionsContext,
} from './use-unified-permissions';

// Tipos para permisos
interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

interface UserPermissions {
  permissions: Permission[];
  roles: string[];
}

// Context para permisos
const PermissionsContext = createContext<{
  permissions: Permission[];
  roles: string[];
  loading: boolean;
  error: string | null;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  refreshPermissions: () => Promise<void>;
} | null>(null);

export function usePermissions() {
  const { user } = useAuthContext();
  const unified = useUnifiedPermissionsContext();
  const lastRefreshRef = useRef<number>(0);

  // Map unified permissions to legacy shape
  const permissions: Permission[] = (unified.permissions || []).map(p => ({
    id: String(p.id),
    name: p.name,
    resource: p.resource,
    action: p.action,
    description: undefined,
  }));

  const roles: string[] = (unified.roles || []).map(r => r.name);

  const hasPermission = (resource: string, action: string): boolean => {
    return unified.hasPermission(resource, action);
  };

  const hasRole = (role: string): boolean => {
    return unified.hasRole(role);
  };

  const isAdmin = (): boolean => {
    return unified.isAdmin;
  };

  const refreshPermissions = async (): Promise<void> => {
    await unified.refreshPermissions();
  };

  // Keep legacy effect to react to user changes by delegating to unified refresh
  useEffect(() => {
    if (user?.id) {
      const now = Date.now();
      const last = lastRefreshRef.current || 0;
      if (now - last > 30_000) {
        lastRefreshRef.current = now;
        unified.refreshPermissions();
      }
    }
  }, [user?.id, unified]);

  return {
    permissions,
    roles,
    loading: unified.loading,
    error: unified.error,
    hasPermission,
    hasRole,
    isAdmin,
    refreshPermissions,
  };
}

// Provider component
export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const permissions = usePermissions();
  
  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

// Hook para usar el contexto de permisos
export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider');
  }
  return context;
}

// Hook para verificar permisos específicos
export function useHasPermission(resource: string, action: string) {
  const { hasPermission, loading } = usePermissionsContext();
  return { hasPermission: hasPermission(resource, action), loading };
}

// Hook para verificar roles específicos
export function useHasRole(role: string) {
  const { hasRole, loading } = usePermissionsContext();
  return { hasRole: hasRole(role), loading };
}

// Hook para verificar si es admin
export function useIsAdminPermission() {
  const { isAdmin, loading } = usePermissionsContext();
  return { isAdmin: isAdmin(), loading };
}
