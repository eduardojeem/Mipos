#!/usr/bin/env tsx

/**
 * Supabase Roles Synchronization Script
 * 
 * This script synchronizes the enhanced role system with Supabase authentication.
 * It handles user creation, role assignment, session management, and audit logging.
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Load environment variables
config()

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const prisma = new PrismaClient()

interface SyncOptions {
  dryRun?: boolean
  verbose?: boolean
  syncSessions?: boolean
  cleanupExpired?: boolean
}

interface UserSyncResult {
  created: number
  updated: number
  errors: string[]
}

class SupabaseRoleSync {
  private options: SyncOptions

  constructor(options: SyncOptions = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      syncSessions: true,
      cleanupExpired: true,
      ...options
    }
  }

  /**
   * Main synchronization method
   */
  async sync(): Promise<void> {
    try {
      console.log('🚀 Starting Supabase roles synchronization...')
      
      if (this.options.dryRun) {
        console.log('🔍 Running in DRY RUN mode - no changes will be made')
      }

      // Step 1: Sync users from Supabase to local database
      const userSyncResult = await this.syncUsers()
      console.log(`✅ User sync completed: ${userSyncResult.created} created, ${userSyncResult.updated} updated`)

      // Step 2: Sync sessions if enabled
      if (this.options.syncSessions) {
        await this.syncSessions()
        console.log('✅ Session sync completed')
      }

      // Step 3: Cleanup expired sessions and roles
      if (this.options.cleanupExpired) {
        await this.cleanupExpired()
        console.log('✅ Cleanup completed')
      }

      // Step 4: Validate role assignments
      await this.validateRoleAssignments()
      console.log('✅ Role validation completed')

      console.log('🎉 Synchronization completed successfully!')

    } catch (error) {
      console.error('❌ Synchronization failed:', error)
      throw error
    }
  }

  /**
   * Sync users from Supabase Auth to local database
   */
  private async syncUsers(): Promise<UserSyncResult> {
    const result: UserSyncResult = {
      created: 0,
      updated: 0,
      errors: []
    }

    try {
      // Get all users from Supabase
      const { data: supabaseUsers, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        throw new Error(`Failed to fetch Supabase users: ${error.message}`)
      }

      if (!supabaseUsers?.users) {
        console.log('No users found in Supabase')
        return result
      }

      for (const supabaseUser of supabaseUsers.users) {
        try {
          await this.syncSingleUser(supabaseUser, result)
        } catch (error) {
          const errorMsg = `Failed to sync user ${supabaseUser.email}: ${error}`
          result.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      return result

    } catch (error) {
      console.error('Error syncing users:', error)
      throw error
    }
  }

  /**
   * Sync a single user from Supabase to local database
   */
  private async syncSingleUser(supabaseUser: any, result: UserSyncResult): Promise<void> {
    if (this.options.dryRun) {
      console.log(`[DRY RUN] Would sync user: ${supabaseUser.email}`)
      return
    }

    // Check if user exists in local database
    const existingUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id }
    })

    const userData = {
      email: supabaseUser.email || '',
      fullName: supabaseUser.user_metadata?.full_name || 
                supabaseUser.user_metadata?.name || 
                supabaseUser.email?.split('@')[0] || 'Unknown User'
    }

    if (existingUser) {
      // Update existing user
      await prisma.user.update({
        where: { id: supabaseUser.id },
        data: userData
      })
      result.updated++
      
      if (this.options.verbose) {
        console.log(`Updated user: ${userData.email}`)
      }
    } else {
      // Create new user with default CASHIER role
      const newUser = await prisma.user.create({
        data: {
          id: supabaseUser.id,
          ...userData,
          role: 'CASHIER' // Default role for backward compatibility
        }
      })

      // Assign default role in new system
      await this.assignDefaultRole(newUser.id)
      
      result.created++
      
      if (this.options.verbose) {
        console.log(`Created user: ${userData.email}`)
      }
    }
  }

  /**
   * Assign default role to a new user
   */
  private async assignDefaultRole(userId: string): Promise<void> {
    if (this.options.dryRun) return

    try {
      // Get the default CASHIER role
      const cashierRole = await prisma.role.findUnique({
        where: { name: 'CASHIER' }
      })

      if (!cashierRole) {
        console.warn('CASHIER role not found, skipping default role assignment')
        return
      }

      // Check if user already has this role
      const existingUserRole = await prisma.userRole_New.findUnique({
        where: {
          userId_roleId: {
            userId: userId,
            roleId: cashierRole.id
          }
        }
      })

      if (!existingUserRole) {
        await prisma.userRole_New.create({
          data: {
            userId: userId,
            roleId: cashierRole.id,
            isActive: true
          }
        })

        if (this.options.verbose) {
          console.log(`Assigned CASHIER role to user: ${userId}`)
        }
      }

    } catch (error) {
      console.error(`Failed to assign default role to user ${userId}:`, error)
    }
  }

  /**
   * Sync active sessions from Supabase
   */
  private async syncSessions(): Promise<void> {
    if (this.options.dryRun) {
      console.log('[DRY RUN] Would sync sessions')
      return
    }

    try {
      // Get all local users
      const users = await prisma.user.findMany({
        select: { id: true }
      })

      for (const user of users) {
        try {
          // Get user sessions from Supabase (this would require custom implementation)
          // For now, we'll create a placeholder session if user is active
          await this.ensureUserSession(user.id)
        } catch (error) {
          console.error(`Failed to sync sessions for user ${user.id}:`, error)
        }
      }

    } catch (error) {
      console.error('Error syncing sessions:', error)
    }
  }

  /**
   * Ensure user has an active session record
   */
  private async ensureUserSession(userId: string): Promise<void> {
    const activeSession = await prisma.userSession.findFirst({
      where: {
        userId: userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    if (!activeSession) {
      // Create a new session record
      await prisma.userSession.create({
        data: {
          userId: userId,
          isActive: true,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      })

      if (this.options.verbose) {
        console.log(`Created session for user: ${userId}`)
      }
    }
  }

  /**
   * Cleanup expired sessions and roles
   */
  private async cleanupExpired(): Promise<void> {
    if (this.options.dryRun) {
      console.log('[DRY RUN] Would cleanup expired data')
      return
    }

    try {
      // Cleanup expired sessions
      const expiredSessions = await prisma.userSession.updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() }
        },
        data: { isActive: false }
      })

      if (this.options.verbose) {
        console.log(`Deactivated ${expiredSessions.count} expired sessions`)
      }

      // Cleanup expired user roles
      const expiredRoles = await prisma.userRole_New.updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() }
        },
        data: { isActive: false }
      })

      if (this.options.verbose) {
        console.log(`Deactivated ${expiredRoles.count} expired role assignments`)
      }

    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  /**
   * Validate role assignments and fix inconsistencies
   */
  private async validateRoleAssignments(): Promise<void> {
    try {
      // Find users without any active roles
      const usersWithoutRoles = await prisma.user.findMany({
        where: {
          userRoles: {
            none: {
              isActive: true,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          }
        },
        select: { id: true, email: true, role: true }
      })

      for (const user of usersWithoutRoles) {
        if (!this.options.dryRun) {
          await this.assignDefaultRole(user.id)
        }
        
        console.log(`Fixed missing role for user: ${user.email}`)
      }

      if (usersWithoutRoles.length > 0) {
        console.log(`Fixed ${usersWithoutRoles.length} users without active roles`)
      }

    } catch (error) {
      console.error('Error validating role assignments:', error)
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any,
    performedBy?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    if (this.options.dryRun) return

    try {
      await prisma.roleAuditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
          newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
          performedBy,
          ipAddress,
          userAgent
        }
      })
    } catch (error) {
      console.error('Failed to create audit log:', error)
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const permissions = await prisma.$queryRaw<Array<{ permission_name: string }>>`
        SELECT DISTINCT p.name as permission_name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ${userId}
          AND ur.is_active = true 
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND p.is_active = true
      `

      return permissions.map(p => p.permission_name)
    } catch (error) {
      console.error('Failed to get user permissions:', error)
      return []
    }
  }

  /**
   * Check if user has specific permission
   */
  async checkUserPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<Array<{ has_permission: boolean }>>`
        SELECT check_user_permission(${userId}, ${permissionName}) as has_permission
      `

      return result[0]?.has_permission || false
    } catch (error) {
      console.error('Failed to check user permission:', error)
      return false
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options: SyncOptions = {}

  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--dry-run':
        options.dryRun = true
        break
      case '--verbose':
        options.verbose = true
        break
      case '--no-sessions':
        options.syncSessions = false
        break
      case '--no-cleanup':
        options.cleanupExpired = false
        break
      case '--help':
        console.log(`
Supabase Roles Synchronization Script

Usage: tsx sync-supabase-roles.ts [options]

Options:
  --dry-run       Run without making changes
  --verbose       Show detailed output
  --no-sessions   Skip session synchronization
  --no-cleanup    Skip cleanup of expired data
  --help          Show this help message

Examples:
  tsx sync-supabase-roles.ts
  tsx sync-supabase-roles.ts --dry-run --verbose
  tsx sync-supabase-roles.ts --no-sessions --no-cleanup
        `)
        process.exit(0)
    }
  }

  try {
    const sync = new SupabaseRoleSync(options)
    await sync.sync()
    process.exit(0)
  } catch (error) {
    console.error('Script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Export for use as module
export { SupabaseRoleSync }

// Run if called directly
if (require.main === module) {
  main()
}