'use client';

import React from 'react';
import { usePermissionsContext } from '@/hooks/use-unified-permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface UnifiedPermissionGuardProps {
  children: React.ReactNode;
  
  // Permission-based access
  resource?: string;
  action?: string;
  permissions?: string[]; // Array of "resource.action" strings
  requireAllPermissions?: boolean;
  
  // Role-based access
  role?: string;
  roles?: string[];
  requireAllRoles?: boolean;
  
  // Fallback and loading
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  showError?: boolean;
  errorMessage?: string;
  
  // Advanced options
  allowSuperAdmin?: boolean; // If true, super admin bypasses all checks
  allowAdmin?: boolean; // If true, admin bypasses most checks
  invertLogic?: boolean; // If true, shows content when conditions are NOT met
}

export function UnifiedPermissionGuard({
  children,
  resource,
  action,
  permissions = [],
  requireAllPermissions = false,
  role,
  roles = [],
  requireAllRoles = false,
  fallback,
  loading: loadingComponent,
  showError = true,
  errorMessage,
  allowSuperAdmin = true,
  allowAdmin = false,
  invertLogic = false,
}: UnifiedPermissionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    hasRole, 
    hasAnyRole,
    loading, 
    isSuperAdmin,
    isAdmin,
    user
  } = usePermissionsContext();

  // Note: avoid returning before hooks to keep hook order consistent

  // Check access conditions
  let hasAccess = false;
  const conditions: boolean[] = [];

  // Super admin bypass
  if (allowSuperAdmin && isSuperAdmin) {
    hasAccess = true;
  }
  // Admin bypass (if allowed)
  else if (allowAdmin && isAdmin) {
    hasAccess = true;
  }
  // Regular permission checks
  else {
    // Single permission check
    if (resource && action) {
      conditions.push(hasPermission(resource, action));
    }

    // Multiple permissions check
    if (permissions.length > 0) {
      if (requireAllPermissions) {
        conditions.push(hasAllPermissions(permissions));
      } else {
        conditions.push(hasAnyPermission(permissions));
      }
    }

    // Single role check
    if (role) {
      conditions.push(hasRole(role));
    }

    // Multiple roles check
    if (roles.length > 0) {
      if (requireAllRoles) {
        conditions.push(roles.every(r => hasRole(r)));
      } else {
        conditions.push(hasAnyRole(roles));
      }
    }

    // Determine access based on conditions
    if (conditions.length === 0) {
      // No conditions specified - deny access by default
      hasAccess = false;
    } else {
      // All conditions must be true for access
      hasAccess = conditions.every(condition => condition);
    }
  }

  // Apply invert logic if specified
  if (invertLogic) {
    hasAccess = !hasAccess;
  }

  // Compute redirect intents without causing navigation during render
  const ready = !loading;
  const redirectToSignin = ready && !user && !hasAccess;
  const redirectToDashboard = ready && !!user && !!pathname && pathname.startsWith('/dashboard') && !hasAccess;

  // Perform navigation as a side effect to avoid updating Router during render
  const redirectedRef = React.useRef(false);
  React.useEffect(() => {
    // Reset redirect flag when path changes
    redirectedRef.current = false;
  }, [pathname]);

  React.useEffect(() => {
    if (!redirectedRef.current) {
      if (redirectToSignin) {
        redirectedRef.current = true;
        router.replace('/auth/signin');
      } else if (redirectToDashboard) {
        redirectedRef.current = true;
        router.replace('/home');
      }
    }
  }, [redirectToSignin, redirectToDashboard, router]);

  // Avoid rendering children while permissions are loading to prevent churn
  if (loading) {
    return <>{loadingComponent ?? null}</>;
  }

  // Render based on access
  if (hasAccess) {
    return <>{children}</>;
  }

  // If a redirect will occur, render nothing
  if (redirectToSignin || redirectToDashboard) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showError) {
    return (
      <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          {errorMessage || getDefaultErrorMessage(resource, action, role, permissions, roles)}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

// Helper function to generate default error messages
function getDefaultErrorMessage(
  resource?: string,
  action?: string,
  role?: string,
  permissions?: string[],
  roles?: string[]
): string {
  if (resource && action) {
    return `No tienes permisos para ${action} en ${resource}.`;
  }
  
  if (permissions && permissions.length > 0) {
    return `No tienes los permisos necesarios: ${permissions.join(', ')}.`;
  }
  
  if (role) {
    return `Necesitas el rol de ${role} para acceder a este contenido.`;
  }
  
  if (roles && roles.length > 0) {
    return `Necesitas uno de estos roles: ${roles.join(', ')}.`;
  }
  
  return 'No tienes permisos para acceder a este contenido.';
}

// Convenience components for common use cases

// Component for admin-only content
export function AdminOnly({ 
  children, 
  fallback, 
  showError = false 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
  showError?: boolean; 
}) {
  return (
    <UnifiedPermissionGuard
      roles={['ADMIN', 'SUPER_ADMIN']}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </UnifiedPermissionGuard>
  );
}

// Component for super admin only content
export function SuperAdminOnly({ 
  children, 
  fallback, 
  showError = false 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
  showError?: boolean; 
}) {
  return (
    <UnifiedPermissionGuard
      role="SUPER_ADMIN"
      allowSuperAdmin={false} // Force explicit super admin check
      fallback={fallback}
      showError={showError}
    >
      {children}
    </UnifiedPermissionGuard>
  );
}

// Component for manager+ content
export function ManagerOrAbove({ 
  children, 
  fallback, 
  showError = false 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
  showError?: boolean; 
}) {
  return (
    <UnifiedPermissionGuard
      roles={['MANAGER', 'ADMIN', 'SUPER_ADMIN']}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </UnifiedPermissionGuard>
  );
}

// Component for specific permission
export function WithPermission({
  resource,
  action,
  children,
  fallback,
  showError = false
}: {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}) {
  return (
    <UnifiedPermissionGuard
      resource={resource}
      action={action}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </UnifiedPermissionGuard>
  );
}

// Component for multiple permissions (any)
export function WithAnyPermission({
  permissions,
  children,
  fallback,
  showError = false
}: {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}) {
  return (
    <UnifiedPermissionGuard
      permissions={permissions}
      requireAllPermissions={false}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </UnifiedPermissionGuard>
  );
}

// Component for multiple permissions (all required)
export function WithAllPermissions({
  permissions,
  children,
  fallback,
  showError = false
}: {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showError?: boolean;
}) {
  return (
    <UnifiedPermissionGuard
      permissions={permissions}
      requireAllPermissions={true}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </UnifiedPermissionGuard>
  );
}

// Higher-order component for permission wrapping
export function withUnifiedPermissions<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<UnifiedPermissionGuardProps, 'children'>
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <UnifiedPermissionGuard {...guardProps}>
        <Component {...props} />
      </UnifiedPermissionGuard>
    );
  };
}

// Hook for conditional rendering
export function useConditionalRender() {
  const permissions = usePermissionsContext();

  return {
    renderIf: (condition: (ctx: typeof permissions) => boolean, component: React.ReactNode) => {
      return condition(permissions) ? component : null;
    },
    renderIfPermission: (resource: string, action: string, component: React.ReactNode) => {
      return permissions.hasPermission(resource, action) ? component : null;
    },
    renderIfRole: (role: string, component: React.ReactNode) => {
      return permissions.hasRole(role) ? component : null;
    },
    renderIfAdmin: (component: React.ReactNode) => {
      return permissions.isAdmin ? component : null;
    },
    renderIfSuperAdmin: (component: React.ReactNode) => {
      return permissions.isSuperAdmin ? component : null;
    },
    renderIfManager: (component: React.ReactNode) => {
      return permissions.isManager ? component : null;
    },
    renderIfCashier: (component: React.ReactNode) => {
      return permissions.isCashier ? component : null;
    }
  };
}
