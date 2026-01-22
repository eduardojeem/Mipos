/**
 * Permission Guard Components
 * 
 * React components for protecting UI elements based on user permissions and roles.
 * These components integrate with the enhanced role management system.
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getRoleManager, UserWithRoles, PERMISSIONS, ROLES } from './role-manager'

// Permission Context
interface PermissionContextType {
  user: UserWithRoles | null
  loading: boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  hasRole: (role: string) => boolean
  isAdmin: boolean
  isCashier: boolean
  isManager: boolean
  refresh: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

// Permission Provider Component
interface PermissionProviderProps {
  children: React.ReactNode
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const [user, setUser] = useState<UserWithRoles | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    try {
      setLoading(true)
      const roleManager = getRoleManager()
      const currentUser = await roleManager.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error loading user permissions:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    return user.permissions.some(p => p.name === permission)
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false
    return permissions.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false
    return permissions.every(permission => hasPermission(permission))
  }

  const hasRole = (role: string): boolean => {
    if (!user) return false
    return user.roles.some(r => r.name === role)
  }

  const contextValue: PermissionContextType = {
    user,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin: hasRole(ROLES.ADMIN),
    isCashier: hasRole(ROLES.CASHIER),
    isManager: hasRole(ROLES.MANAGER),
    refresh: loadUser
  }

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  )
}

// Hook to use permission context
export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

// Permission Guard Component
interface PermissionGuardProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  roles?: string[]
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  role,
  roles = [],
  fallback = null,
  loading: loadingComponent = null
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, loading } = usePermissions()

  if (loading) {
    return <>{loadingComponent}</>
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    
    if (!hasRequiredPermissions) {
      return <>{fallback}</>
    }
  }

  // Check single role
  if (role && !hasRole(role)) {
    return <>{fallback}</>
  }

  // Check multiple roles
  if (roles.length > 0) {
    const hasRequiredRole = roles.some(r => hasRole(r))
    if (!hasRequiredRole) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

// Admin Guard Component
interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

export function AdminGuard({ children, fallback = null, loading: loadingComponent = null }: AdminGuardProps) {
  return (
    <PermissionGuard
      role={ROLES.ADMIN}
      fallback={fallback}
      loading={loadingComponent}
    >
      {children}
    </PermissionGuard>
  )
}

// Manager or Admin Guard Component
export function ManagerGuard({ children, fallback = null, loading: loadingComponent = null }: AdminGuardProps) {
  return (
    <PermissionGuard
      roles={[ROLES.ADMIN, ROLES.MANAGER]}
      fallback={fallback}
      loading={loadingComponent}
    >
      {children}
    </PermissionGuard>
  )
}

// Cashier Guard Component (includes all roles that can perform sales)
export function CashierGuard({ children, fallback = null, loading: loadingComponent = null }: AdminGuardProps) {
  return (
    <PermissionGuard
      roles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER]}
      fallback={fallback}
      loading={loadingComponent}
    >
      {children}
    </PermissionGuard>
  )
}

// Specific Permission Guards for common operations
export function CanCreateUsers({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <PermissionGuard permission={PERMISSIONS.USERS_CREATE} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function CanManageProducts({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <PermissionGuard 
      permissions={[PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_UPDATE, PERMISSIONS.PRODUCTS_DELETE]}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function CanViewReports({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <PermissionGuard permission={PERMISSIONS.REPORTS_READ} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function CanMakeSales({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <PermissionGuard permission={PERMISSIONS.SALES_CREATE} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function CanManageSystem({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <PermissionGuard 
      permissions={[PERMISSIONS.SYSTEM_CONFIG, PERMISSIONS.SYSTEM_BACKUP]}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

// Higher-order component for permission-based rendering
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: {
    permission?: string
    permissions?: string[]
    requireAll?: boolean
    role?: string
    roles?: string[]
  }
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard {...requiredPermissions}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

// Hook for conditional rendering based on permissions
export function useConditionalRender() {
  const permissions = usePermissions()

  return {
    renderIf: (condition: (permissions: PermissionContextType) => boolean, component: React.ReactNode) => {
      return condition(permissions) ? component : null
    },
    renderIfPermission: (permission: string, component: React.ReactNode) => {
      return permissions.hasPermission(permission) ? component : null
    },
    renderIfRole: (role: string, component: React.ReactNode) => {
      return permissions.hasRole(role) ? component : null
    },
    renderIfAdmin: (component: React.ReactNode) => {
      return permissions.isAdmin ? component : null
    },
    renderIfManager: (component: React.ReactNode) => {
      return permissions.isManager ? component : null
    },
    renderIfCashier: (component: React.ReactNode) => {
      return permissions.isCashier ? component : null
    }
  }
}

// Permission-aware button component
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  roles?: string[]
  children: React.ReactNode
}

export function PermissionButton({
  permission,
  permissions = [],
  requireAll = false,
  role,
  roles = [],
  children,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, loading } = usePermissions()

  const isDisabled = loading || disabled || (() => {
    // Check single permission
    if (permission && !hasPermission(permission)) return true

    // Check multiple permissions
    if (permissions.length > 0) {
      const hasRequiredPermissions = requireAll 
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions)
      if (!hasRequiredPermissions) return true
    }

    // Check single role
    if (role && !hasRole(role)) return true

    // Check multiple roles
    if (roles.length > 0) {
      const hasRequiredRole = roles.some(r => hasRole(r))
      if (!hasRequiredRole) return true
    }

    return false
  })()

  return (
    <button disabled={isDisabled} {...props}>
      {children}
    </button>
  )
}

// Permission-aware link component
interface PermissionLinkProps {
  href: string
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  roles?: string[]
  children: React.ReactNode
  className?: string
  fallback?: React.ReactNode
}

export function PermissionLink({
  href,
  permission,
  permissions = [],
  requireAll = false,
  role,
  roles = [],
  children,
  className,
  fallback = null
}: PermissionLinkProps) {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      role={role}
      roles={roles}
      fallback={fallback}
    >
      <a href={href} className={className}>
        {children}
      </a>
    </PermissionGuard>
  )
}