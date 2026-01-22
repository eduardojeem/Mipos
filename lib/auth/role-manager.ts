/**
 * Role Manager - Enhanced role and permission management system
 * 
 * This module provides a comprehensive role management system that integrates
 * with Supabase authentication and the enhanced database schema.
 */

import { PrismaClient } from '@prisma/client'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { cache } from 'react'

const prisma = new PrismaClient()

export interface UserPermission {
  name: string
  displayName: string
  resource: string
  action: string
}

export interface UserRole {
  id: number
  name: string
  displayName: string
  description?: string
  permissions: UserPermission[]
}

export interface UserWithRoles {
  id: string
  email: string
  fullName: string
  roles: UserRole[]
  permissions: UserPermission[]
  legacyRole: string // For backward compatibility
}

export class RoleManager {
  private static instance: RoleManager
  
  private constructor() {}

  static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager()
    }
    return RoleManager.instance
  }

  /**
   * Get current authenticated user with roles and permissions
   */
  async getCurrentUser(): Promise<UserWithRoles | null> {
    try {
      const supabase = createServerComponentClient({ cookies })
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        return null
      }

      return await this.getUserWithRoles(session.user.id)
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  /**
   * Get user with roles and permissions by ID
   */
  async getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            where: {
              isActive: true,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            },
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!user) {
        return null
      }

      // Transform data to expected format
      const roles: UserRole[] = user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        displayName: ur.role.displayName,
        description: ur.role.description || undefined,
        permissions: ur.role.permissions.filter(rp => rp.permission.isActive).map(rp => ({
          name: rp.permission.name,
          displayName: rp.permission.displayName,
          resource: rp.permission.resource,
          action: rp.permission.action
        }))
      }))

      // Get all unique permissions
      const allPermissions = new Map<string, UserPermission>()
      roles.forEach(role => {
        role.permissions.forEach(permission => {
          allPermissions.set(permission.name, permission)
        })
      })

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
        permissions: Array.from(allPermissions.values()),
        legacyRole: user.role
      }
    } catch (error) {
      console.error('Error getting user with roles:', error)
      return null
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const normalized = normalizePermissionName(permissionName)
      const result = await prisma.$queryRaw<Array<{ has_permission: boolean }>>`
        SELECT check_user_permission(${userId}, ${normalized}) as has_permission
      `

      return result[0]?.has_permission || false
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    try {
      for (const permission of permissions.map(normalizePermissionName)) {
        if (await this.hasPermission(userId, permission)) {
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Error checking any permission:', error)
      return false
    }
  }

  /**
   * Check if user has all specified permissions
   */
  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    try {
      for (const permission of permissions.map(normalizePermissionName)) {
        if (!(await this.hasPermission(userId, permission))) {
          return false
        }
      }
      return true
    } catch (error) {
      console.error('Error checking all permissions:', error)
      return false
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const userRole = await prisma.userRole_New.findFirst({
        where: {
          userId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          role: {
            name: roleName,
            isActive: true
          }
        }
      })

      return !!userRole
    } catch (error) {
      console.error('Error checking role:', error)
      return false
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string, 
    roleName: string, 
    assignedBy?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      // Get the role
      const role = await prisma.role.findUnique({
        where: { name: roleName, isActive: true }
      })

      if (!role) {
        throw new Error(`Role ${roleName} not found`)
      }

      // Check if user already has this role
      const existingUserRole = await prisma.userRole_New.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId: role.id
          }
        }
      })

      if (existingUserRole) {
        // Update existing role assignment
        await prisma.userRole_New.update({
          where: { id: existingUserRole.id },
          data: {
            isActive: true,
            assignedBy,
            expiresAt,
            assignedAt: new Date()
          }
        })
      } else {
        // Create new role assignment
        await prisma.userRole_New.create({
          data: {
            userId,
            roleId: role.id,
            assignedBy,
            expiresAt,
            isActive: true
          }
        })
      }

      // Create audit log
      await this.createAuditLog(
        userId,
        'ROLE_ASSIGNED',
        'user_roles',
        undefined,
        { roleName },
        assignedBy
      )

      return true
    } catch (error) {
      console.error('Error assigning role:', error)
      return false
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleName: string, removedBy?: string): Promise<boolean> {
    try {
      const role = await prisma.role.findUnique({
        where: { name: roleName }
      })

      if (!role) {
        throw new Error(`Role ${roleName} not found`)
      }

      const userRole = await prisma.userRole_New.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId: role.id
          }
        }
      })

      if (userRole) {
        await prisma.userRole_New.update({
          where: { id: userRole.id },
          data: { isActive: false }
        })

        // Create audit log
        await this.createAuditLog(
          userId,
          'ROLE_REMOVED',
          'user_roles',
          userRole.id.toString(),
          { roleName },
          removedBy
        )
      }

      return true
    } catch (error) {
      console.error('Error removing role:', error)
      return false
    }
  }

  /**
   * Get all available roles
   */
  async getAllRoles(): Promise<UserRole[]> {
    try {
      const roles = await prisma.role.findMany({
        where: { isActive: true },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        },
        orderBy: { displayName: 'asc' }
      })

      return roles.map(role => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description || undefined,
        permissions: role.permissions.filter(rp => rp.permission.isActive).map(rp => ({
          name: rp.permission.name,
          displayName: rp.permission.displayName,
          resource: rp.permission.resource,
          action: rp.permission.action
        }))
      }))
    } catch (error) {
      console.error('Error getting all roles:', error)
      return []
    }
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<UserPermission[]> {
    try {
      const permissions = await prisma.permission.findMany({
        where: { isActive: true },
        orderBy: [{ resource: 'asc' }, { action: 'asc' }]
      })

      return permissions.map(p => ({
        name: p.name,
        displayName: p.displayName,
        resource: p.resource,
        action: p.action
      }))
    } catch (error) {
      console.error('Error getting all permissions:', error)
      return []
    }
  }

  /**
   * Create a new role
   */
  async createRole(
    name: string,
    displayName: string,
    description?: string,
    permissions: string[] = [],
    createdBy?: string
  ): Promise<number | null> {
    try {
      const role = await prisma.role.create({
        data: {
          name,
          displayName,
          description,
          isSystemRole: false,
          isActive: true
        }
      })

      // Assign permissions to the role
      if (permissions.length > 0) {
        await this.assignPermissionsToRole(role.id, permissions, createdBy)
      }

      // Create audit log
      await this.createAuditLog(
        createdBy || 'system',
        'ROLE_CREATED',
        'roles',
        role.id.toString(),
        { name, displayName, description, permissions },
        createdBy
      )

      return role.id
    } catch (error) {
      console.error('Error creating role:', error)
      return null
    }
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissionsToRole(
    roleId: number,
    permissionNames: string[],
    grantedBy?: string
  ): Promise<boolean> {
    try {
      const permissions = await prisma.permission.findMany({
        where: {
          name: { in: permissionNames },
          isActive: true
        }
      })

      const rolePermissions = permissions.map(permission => ({
        roleId,
        permissionId: permission.id,
        grantedBy
      }))

      await prisma.rolePermission.createMany({
        data: rolePermissions,
        skipDuplicates: true
      })

      return true
    } catch (error) {
      console.error('Error assigning permissions to role:', error)
      return false
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    values?: any,
    performedBy?: string
  ): Promise<void> {
    try {
      await prisma.roleAuditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          newValues: values ? JSON.parse(JSON.stringify(values)) : null,
          performedBy
        }
      })
    } catch (error) {
      console.error('Error creating audit log:', error)
    }
  }

  /**
   * Update user session activity
   */
  async updateSessionActivity(userId: string, sessionId?: string): Promise<void> {
    try {
      const session = await prisma.userSession.findFirst({
        where: {
          userId,
          isActive: true,
          ...(sessionId && { supabaseSessionId: sessionId })
        }
      })

      if (session) {
        await prisma.userSession.update({
          where: { id: session.id },
          data: { lastActivity: new Date() }
        })
      }
    } catch (error) {
      console.error('Error updating session activity:', error)
    }
  }

  /**
   * Clean up expired sessions and roles
   */
  async cleanupExpired(): Promise<void> {
    try {
      // Deactivate expired sessions
      await prisma.userSession.updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() }
        },
        data: { isActive: false }
      })

      // Deactivate expired role assignments
      await prisma.userRole_New.updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() }
        },
        data: { isActive: false }
      })
    } catch (error) {
      console.error('Error cleaning up expired data:', error)
    }
  }
}

// Cached version for server components
export const getRoleManager = cache(() => RoleManager.getInstance())

// Helper functions for common operations
export async function getCurrentUserPermissions(): Promise<string[]> {
  const roleManager = getRoleManager()
  const user = await roleManager.getCurrentUser()
  return user?.permissions.map(p => p.name) || []
}

export async function checkCurrentUserPermission(permission: string): Promise<boolean> {
  const roleManager = getRoleManager()
  const user = await roleManager.getCurrentUser()
  if (!user) return false
  
  return roleManager.hasPermission(user.id, normalizePermissionName(permission))
}

export async function checkCurrentUserRole(roleName: string): Promise<boolean> {
  const roleManager = getRoleManager()
  const user = await roleManager.getCurrentUser()
  if (!user) return false
  
  return roleManager.hasRole(user.id, roleName)
}

// Permission constants for easy reference
export const PERMISSIONS = {
  // User management
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  
  // Product management
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_READ: 'products.read',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',
  
  // Sales
  SALES_CREATE: 'sales.create',
  SALES_READ: 'sales.read',
  SALES_UPDATE: 'sales.update',
  SALES_DELETE: 'sales.delete',
  
  // Inventory
  INVENTORY_READ: 'inventory.read',
  INVENTORY_UPDATE: 'inventory.update',
  
  // Reports
  REPORTS_READ: 'reports.read',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  
  // System
  SYSTEM_CONFIG: 'system.config',
  SYSTEM_BACKUP: 'system.backup',
  ROLES_MANAGE: 'roles.manage'
} as const

// Role constants
export const ROLES = {
  ADMIN: 'ADMIN',
  CASHIER: 'CASHIER',
  MANAGER: 'MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  VIEWER: 'VIEWER'
} as const

/**
 * Normaliza nombres de permisos a la convención del backend.
 * Ej.: 'reports.view' -> 'reports.read'
 */
export function normalizePermissionName(name: string): string {
  if (!name) return name
  return name.replace(/\.view$/, '.read')
}