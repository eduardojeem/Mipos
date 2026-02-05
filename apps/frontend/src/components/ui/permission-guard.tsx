'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { usePermissionsContext as useUnifiedPermissionsContext } from '@/hooks/use-unified-permissions';

// Tipos de permisos del sistema
export type Permission = 
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'products.export'
  | 'products.import'
  | 'categories.view'
  | 'categories.create'
  | 'categories.edit'
  | 'categories.delete'
  | 'sales.view'
  | 'sales.create'
  | 'sales.edit'
  | 'sales.delete'
  | 'sales.reports'
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  | 'customers.export'
  | 'suppliers.view'
  | 'suppliers.create'
  | 'suppliers.edit'
  | 'suppliers.delete'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'settings.view'
  | 'settings.edit'
  | 'reports.view'
  | 'reports.export'
  | 'dashboard.view'
  | 'pos.access'
  | 'returns.view'
  | 'returns.create'
  | 'returns.edit'
  | 'returns.delete'
  | 'returns.export'
  | 'content.view'
  | 'content.create'
  | 'content.edit'
  | 'content.delete'
  | 'content.export'
  | 'content.configure'
  | 'returns.approve'
  | 'returns.process'
  | 'stock-alerts.view'
  | 'stock-alerts.create'
  | 'stock-alerts.edit'
  | 'stock-alerts.delete'
  | 'stock-alerts.export'
  | 'stock-alerts.configure';

// Roles del sistema y sus permisos
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.export', 'products.import',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
    'sales.view', 'sales.create', 'sales.edit', 'sales.delete', 'sales.reports',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.export',
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'settings.view', 'settings.edit',
    'reports.view', 'reports.export',
    'returns.view', 'returns.create', 'returns.edit', 'returns.delete', 'returns.export', 'returns.approve', 'returns.process',
    'stock-alerts.view', 'stock-alerts.create', 'stock-alerts.edit', 'stock-alerts.delete', 'stock-alerts.export', 'stock-alerts.configure',
    'content.view', 'content.create', 'content.edit', 'content.delete', 'content.export', 'content.configure',
    'dashboard.view',
    'pos.access'
  ],
  MANAGER: [
    'products.view', 'products.create', 'products.edit', 'products.export', 'products.import',
    'categories.view', 'categories.create', 'categories.edit',
    'sales.view', 'sales.create', 'sales.edit', 'sales.reports',
    'customers.view', 'customers.create', 'customers.edit', 'customers.export',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'reports.view', 'reports.export',
    'returns.view', 'returns.create', 'returns.edit', 'returns.export', 'returns.approve', 'returns.process',
    'stock-alerts.view', 'stock-alerts.create', 'stock-alerts.edit', 'stock-alerts.export', 'stock-alerts.configure',
    'content.view', 'content.create', 'content.edit', 'content.export',
    'dashboard.view',
    'pos.access'
  ],
  EMPLOYEE: [
    'products.view',
    'categories.view',
    'sales.view', 'sales.create',
    'customers.view', 'customers.create',
    'returns.view', 'returns.create',
    'stock-alerts.view',
    'content.view',
    'dashboard.view',
    'pos.access'
  ],
  CASHIER: [
    'products.view',
    'sales.view', 'sales.create',
    'customers.view',
    'returns.view', 'returns.create',
    'stock-alerts.view',
    'pos.access'
  ]
};

interface PermissionGuardProps {
  permission: Permission | Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
  requireAll?: boolean; // Si es true, requiere TODOS los permisos. Si es false, requiere AL MENOS UNO
  requireAdmin?: boolean; // Requiere rol ADMIN o SUPER_ADMIN
  requireRoles?: string[]; // Lista de roles permitidos adicionales
}

interface PermissionContextType {
  hasPermission: (permission: Permission | Permission[]) => boolean;
  userRole: string | null;
  userPermissions: Permission[];
}

const PermissionContext = React.createContext<PermissionContextType | null>(null);

// Provider de permisos
export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const unified = useUnifiedPermissionsContext();

  const userRole = unified?.user?.role || user?.role || null;

  const fallbackPerms = React.useMemo<Permission[]>(() => {
    return userRole ? ROLE_PERMISSIONS[userRole] || [] : [];
  }, [userRole]);

  const userPermissions = React.useMemo<Permission[]>(() => {
    if (!unified || !Array.isArray(unified.permissions)) return fallbackPerms;
    const mapped = unified.permissions.map(p => `${p.resource}.${p.action}` as Permission);
    return Array.from(new Set(mapped));
  }, [unified, unified?.permissions, fallbackPerms]);

  const hasPermission = React.useCallback((permission: Permission | Permission[]): boolean => {
    const permissions = Array.isArray(permission) ? permission : [permission];
    if (!unified || !unified.user) {
      // Fallback a mapa local si no hay contexto unificado
      return permissions.some(perm => userPermissions.includes(perm));
    }

    // Usa el contexto unificado: por defecto requiere al menos uno
    return unified.hasAnyPermission(permissions);
  }, [unified, userPermissions]);

  const contextValue: PermissionContextType = {
    hasPermission,
    userRole,
    userPermissions
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

// Hook para usar permisos
export function usePermissions() {
  const context = React.useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions debe usarse dentro de PermissionProvider');
  }
  return context;
}

// Componente principal PermissionGuard
export function PermissionGuard({
  permission,
  children,
  fallback,
  showError = true,
  requireAll = false,
  requireAdmin = false,
  requireRoles
}: PermissionGuardProps) {
  const { user, loading } = useAuth();
  const { hasPermission, userRole, userPermissions } = usePermissions();

  // Evitar mostrar alertas mientras el estado de autenticación está cargando
  if (loading) {
    return fallback ? <>{fallback}</> : null;
  }

  // Si no hay usuario autenticado
  if (!user) {
    if (fallback) return <>{fallback}</>;
    
    if (showError) {
      return (
        <Alert className="border-amber-200 bg-amber-50">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Debes iniciar sesión para acceder a esta funcionalidad.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];

  // Verificación de rol ADMIN/SUPER_ADMIN o roles específicos
  const normalizedRole = (userRole || '').toUpperCase();
  const adminOK = ['ADMIN', 'SUPER_ADMIN'].includes(normalizedRole);
  const rolesOK = Array.isArray(requireRoles)
    ? requireRoles.map(r => r.toUpperCase()).includes(normalizedRole)
    : true;
  if (requireAdmin && !adminOK) {
    // sin acceso por rol
    if (fallback) return <>{fallback}</>;
    if (showError) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Requiere rol de administrador.
            <div className="mt-2 text-sm text-red-600">Rol actual: <span className="font-medium">{userRole}</span></div>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }
  if (!rolesOK) {
    if (fallback) return <>{fallback}</>;
    if (showError) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Tu rol no tiene acceso a esta sección.
            <div className="mt-2 text-sm text-red-600">Rol actual: <span className="font-medium">{userRole}</span></div>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  // Verificar permisos
  const hasAccess = requireAll 
    ? permissions.every(perm => hasPermission(perm))
    : hasPermission(permissions);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Si no tiene permisos
  if (fallback) return <>{fallback}</>;

  if (showError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <Shield className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          No tienes permisos suficientes para acceder a esta funcionalidad.
          <div className="mt-2 text-sm text-red-600">
            Rol actual: <span className="font-medium">{userRole}</span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// Componente para mostrar contenido basado en rol
interface RoleGuardProps {
  roles: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { user } = useAuth();
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const hasRole = user?.role && allowedRoles.includes(user.role);

  if (hasRole) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}

// Hook para verificar permisos específicos
export function useHasPermission(permission: Permission | Permission[], requireAll = false) {
  const { hasPermission, userRole } = usePermissions();
  
  return React.useMemo(() => {
    if (!userRole) return false;
    
    const permissions = Array.isArray(permission) ? permission : [permission];
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    
    return requireAll 
      ? permissions.every(perm => userPermissions.includes(perm))
      : permissions.some(perm => userPermissions.includes(perm));
  }, [permission, requireAll, userRole]);
}

// Componente para mostrar información de permisos (útil para debugging)
export function PermissionDebugger() {
  const { user } = useAuth();
  const { userRole, userPermissions } = usePermissions();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-900 text-white rounded-lg shadow-lg max-w-sm z-50">
      <div className="text-sm font-medium mb-2">Debug - Permisos</div>
      <div className="text-xs space-y-1">
        <div>Usuario: {user?.email || 'No autenticado'}</div>
        <div>Rol: {userRole || 'Sin rol'}</div>
        <div>Permisos: {userPermissions.length}</div>
        <details className="mt-2">
          <summary className="cursor-pointer">Ver permisos</summary>
          <div className="mt-1 max-h-32 overflow-y-auto">
            {userPermissions.map(perm => (
              <div key={perm} className="text-xs opacity-75">{perm}</div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

export default PermissionGuard;
