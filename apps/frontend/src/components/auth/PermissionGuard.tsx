'use client';

import React from 'react';
import { usePermissionsContext } from '@/hooks/use-permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  resource?: string;
  action?: string;
  role?: string;
  requireAll?: boolean; // Si es true, requiere todos los permisos/roles especificados
  fallback?: React.ReactNode;
  showError?: boolean;
}

export function PermissionGuard({
  children,
  resource,
  action,
  role,
  requireAll = false,
  fallback,
  showError = true,
}: PermissionGuardProps) {
  const { hasPermission, hasRole, loading, isAdmin } = usePermissionsContext();

  // Mostrar loading mientras se cargan los permisos
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar permisos
  let hasAccess = false;

  // Si es admin, tiene acceso a todo (excepto si se especifica un rol específico)
  if (isAdmin() && !role) {
    hasAccess = true;
  } else {
    const conditions: boolean[] = [];

    // Verificar permiso específico
    if (resource && action) {
      conditions.push(hasPermission(resource, action));
    }

    // Verificar rol específico
    if (role) {
      conditions.push(hasRole(role));
    }

    // Si no se especifica nada, denegar acceso
    if (conditions.length === 0) {
      hasAccess = false;
    } else if (requireAll) {
      // Requiere todos los permisos/roles
      hasAccess = conditions.every(condition => condition);
    } else {
      // Requiere al menos uno
      hasAccess = conditions.some(condition => condition);
    }
  }

  // Si no tiene acceso, mostrar fallback o error
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showError) {
      return (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            No tienes permisos para acceder a esta sección.
            {resource && action && ` Se requiere permiso: ${resource}:${action}`}
            {role && ` Se requiere rol: ${role}`}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
}

// Componente específico para proteger rutas de admin
export function AdminGuard({
  children,
  fallback,
  showError = true,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}) {
  return (
    <PermissionGuard
      role="ADMIN"
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  );
}

// Componente para mostrar contenido solo si tiene un permiso específico
export function WithPermission({
  resource,
  action,
  children,
  fallback,
}: {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard
      resource={resource}
      action={action}
      fallback={fallback}
      showError={false}
    >
      {children}
    </PermissionGuard>
  );
}

// Componente para mostrar contenido solo si tiene un rol específico
export function WithRole({
  role,
  children,
  fallback,
}: {
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard
      role={role}
      fallback={fallback}
      showError={false}
    >
      {children}
    </PermissionGuard>
  );
}