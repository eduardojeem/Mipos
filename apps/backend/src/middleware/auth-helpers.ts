import type { Request, Response, NextFunction } from 'express'
import { securityLogger } from './security-logger'
import type { EnhancedAuthenticatedRequest } from './enhanced-auth'

export const requirePermission = (resource: string, action: string) => {
  return (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      securityLogger.logPermission(false, req, resource, action, {
        reason: 'No authenticated user',
      })
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    const hasPermission =
      req.user.permissions?.some(
        (permission) => permission.resource === resource && permission.action === action,
      ) || false

    securityLogger.logPermission(hasPermission, req, resource, action, {
      userPermissions: req.user.permissions?.map((p) => `${p.resource}:${p.action}`) || [],
    })

    if (!hasPermission) {
      return res.status(403).json({
        error: `Insufficient permissions. Required: ${resource}:${action}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: { resource, action },
      })
    }

    next()
  }
}

export const requireAnyPermission = (
  permissions: Array<{ resource: string; action: string }>,
) => {
  return (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      securityLogger.logPermission(false, req, 'multiple', 'any', {
        reason: 'No authenticated user',
        requiredPermissions: permissions,
      })
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    const hasAnyPermission = permissions.some(
      (requiredPerm) =>
        req.user!.permissions?.some(
          (userPerm) =>
            userPerm.resource === requiredPerm.resource && userPerm.action === requiredPerm.action,
        ) || false,
    )

    securityLogger.logPermission(hasAnyPermission, req, 'multiple', 'any', {
      requiredPermissions: permissions,
      userPermissions: req.user.permissions?.map((p) => `${p.resource}:${p.action}`) || [],
    })

    if (!hasAnyPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
      })
    }

    next()
  }
}

export const requireRole = (roleName: string) => {
  return (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    const hasRole = req.user.roles.some((role) => role.name === roleName)

    if (!hasRole) {
      return res.status(403).json({
        error: `Role required: ${roleName}`,
        code: 'INSUFFICIENT_ROLE',
        required: roleName,
      })
    }

    next()
  }
}

export const requireAnyRole = (roleNames: string[]) => {
  return (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      })
    }

    const hasAnyRole = roleNames.some((roleName) =>
      req.user!.roles.some((role) => role.name === roleName),
    )

    if (!hasAnyRole) {
      return res.status(403).json({
        error: `One of these roles required: ${roleNames.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
        required: roleNames,
      })
    }

    next()
  }
}

export const requireUserManagement = requirePermission('users', 'manage')
export const requireProductManagement = requirePermission('products', 'manage')
export const requireSalesAccess = requirePermission('sales', 'create')
export const requireReportsAccess = requirePermission('reports', 'view')
export const requireSystemConfig = requirePermission('system', 'configure')

export const requireAdmin = requireRole('ADMINISTRADOR')
export const requireManager = requireRole('GERENTE')
export const requireCashier = requireRole('VENDEDOR')
export const requireAdminOrManager = requireAnyRole(['ADMINISTRADOR', 'GERENTE'])
export const requireAdminOrCashier = requireAnyRole(['ADMINISTRADOR', 'VENDEDOR'])

export const hasPermission = (
  user: EnhancedAuthenticatedRequest['user'],
  resource: string,
  action: string,
): boolean => {
  if (!user || !user.permissions) return false
  return user.permissions.some(
    (permission) => permission.resource === resource && permission.action === action,
  )
}

export const hasRole = (
  user: EnhancedAuthenticatedRequest['user'],
  roleName: string,
): boolean => {
  if (!user || !user.roles) return false
  return user.roles.some((role) => role.name === roleName)
}

