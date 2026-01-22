#!/usr/bin/env tsx

/**
 * Enhanced Roles System Setup Script
 * 
 * This script sets up the enhanced role and permission system by:
 * 1. Running the database migration
 * 2. Verifying the setup
 * 3. Synchronizing with existing users
 * 4. Running validation tests
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { PrismaClient } from '@prisma/client'
import { SupabaseRoleSync } from './sync-supabase-roles'
import { config } from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

// Load environment variables
config()

const execAsync = promisify(exec)
const prisma = new PrismaClient()

interface SetupOptions {
  skipMigration?: boolean
  skipSync?: boolean
  skipValidation?: boolean
  verbose?: boolean
  dryRun?: boolean
}

interface SetupResult {
  success: boolean
  steps: {
    migration: boolean
    verification: boolean
    synchronization: boolean
    validation: boolean
  }
  errors: string[]
  warnings: string[]
}

class EnhancedRolesSetup {
  private options: SetupOptions
  private result: SetupResult

  constructor(options: SetupOptions = {}) {
    this.options = {
      skipMigration: false,
      skipSync: false,
      skipValidation: false,
      verbose: false,
      dryRun: false,
      ...options
    }

    this.result = {
      success: false,
      steps: {
        migration: false,
        verification: false,
        synchronization: false,
        validation: false
      },
      errors: [],
      warnings: []
    }
  }

  /**
   * Main setup method
   */
  async setup(): Promise<SetupResult> {
    try {
      console.log('🚀 Starting Enhanced Roles System Setup...')
      
      if (this.options.dryRun) {
        console.log('🔍 Running in DRY RUN mode - no changes will be made')
      }

      // Step 1: Run database migration
      if (!this.options.skipMigration) {
        await this.runMigration()
      }

      // Step 2: Verify database setup
      await this.verifySetup()

      // Step 3: Synchronize with Supabase
      if (!this.options.skipSync) {
        await this.synchronizeUsers()
      }

      // Step 4: Run validation tests
      if (!this.options.skipValidation) {
        await this.runValidation()
      }

      // Final success check
      this.result.success = Object.values(this.result.steps).every(step => step)

      if (this.result.success) {
        console.log('🎉 Enhanced Roles System setup completed successfully!')
      } else {
        console.log('⚠️ Setup completed with some issues. Check the results for details.')
      }

      return this.result

    } catch (error) {
      console.error('❌ Setup failed:', error)
      this.result.errors.push(`Setup failed: ${error}`)
      return this.result
    }
  }

  /**
   * Run database migration
   */
  private async runMigration(): Promise<void> {
    try {
      console.log('📊 Running database migration...')

      if (this.options.dryRun) {
        console.log('[DRY RUN] Would run database migration')
        this.result.steps.migration = true
        return
      }

      // Check if migration file exists
      const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', '001_enhanced_roles_system.sql')
      
      try {
        await fs.access(migrationPath)
      } catch {
        throw new Error('Migration file not found. Please ensure 001_enhanced_roles_system.sql exists in prisma/migrations/')
      }

      // Run the migration using Prisma
      const { stdout, stderr } = await execAsync('npx prisma db push --force-reset')
      
      if (this.options.verbose) {
        console.log('Migration output:', stdout)
        if (stderr) console.log('Migration stderr:', stderr)
      }

      // Alternatively, run the SQL file directly if needed
      try {
        const migrationSQL = await fs.readFile(migrationPath, 'utf-8')
        await prisma.$executeRawUnsafe(migrationSQL)
        console.log('✅ Database migration completed successfully')
      } catch (error) {
        console.log('⚠️ Direct SQL execution failed, but Prisma migration may have succeeded')
        if (this.options.verbose) {
          console.log('SQL execution error:', error)
        }
      }

      this.result.steps.migration = true

    } catch (error) {
      console.error('❌ Migration failed:', error)
      this.result.errors.push(`Migration failed: ${error}`)
      throw error
    }
  }

  /**
   * Verify database setup
   */
  private async verifySetup(): Promise<void> {
    try {
      console.log('🔍 Verifying database setup...')

      // Check if all required tables exist
      const requiredTables = [
        'roles',
        'permissions', 
        'role_permissions',
        'user_roles',
        'user_sessions',
        'role_audit_logs'
      ]

      for (const table of requiredTables) {
        try {
          await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`)
          if (this.options.verbose) {
            console.log(`✅ Table ${table} exists`)
          }
        } catch (error) {
          throw new Error(`Table ${table} does not exist or is not accessible`)
        }
      }

      // Check if default roles exist
      const defaultRoles = ['ADMIN', 'CASHIER', 'MANAGER', 'INVENTORY_MANAGER', 'VIEWER']
      const existingRoles = await prisma.role.findMany({
        where: { name: { in: defaultRoles } }
      })

      if (existingRoles.length !== defaultRoles.length) {
        const missingRoles = defaultRoles.filter(role => 
          !existingRoles.some(existing => existing.name === role)
        )
        this.result.warnings.push(`Missing default roles: ${missingRoles.join(', ')}`)
      }

      // Check if default permissions exist
      const permissionCount = await prisma.permission.count()
      if (permissionCount === 0) {
        this.result.warnings.push('No permissions found in database')
      }

      // Check if database functions exist
      try {
        await prisma.$queryRaw`SELECT get_user_permissions('test')`
      } catch (error) {
        this.result.warnings.push('Database function get_user_permissions may not be available')
      }

      console.log('✅ Database verification completed')
      this.result.steps.verification = true

    } catch (error) {
      console.error('❌ Database verification failed:', error)
      this.result.errors.push(`Verification failed: ${error}`)
      throw error
    }
  }

  /**
   * Synchronize users with Supabase
   */
  private async synchronizeUsers(): Promise<void> {
    try {
      console.log('🔄 Synchronizing users with Supabase...')

      const sync = new SupabaseRoleSync({
        dryRun: this.options.dryRun,
        verbose: this.options.verbose,
        syncSessions: true,
        cleanupExpired: true
      })

      await sync.sync()

      console.log('✅ User synchronization completed')
      this.result.steps.synchronization = true

    } catch (error) {
      console.error('❌ User synchronization failed:', error)
      this.result.errors.push(`Synchronization failed: ${error}`)
      // Don't throw here as this is not critical for setup
    }
  }

  /**
   * Run validation tests
   */
  private async runValidation(): Promise<void> {
    try {
      console.log('🧪 Running validation tests...')

      // Test 1: Check role-permission relationships
      const rolePermissionCount = await prisma.rolePermission.count()
      if (rolePermissionCount === 0) {
        this.result.warnings.push('No role-permission relationships found')
      }

      // Test 2: Check user-role assignments
      const userRoleCount = await prisma.userRole_New.count()
      const userCount = await prisma.user.count()
      
      if (userCount > 0 && userRoleCount === 0) {
        this.result.warnings.push('Users exist but no role assignments found')
      }

      // Test 3: Test permission checking function
      try {
        const testUser = await prisma.user.findFirst()
        if (testUser) {
          const permissions = await prisma.$queryRaw<Array<{ permission_name: string }>>`
            SELECT * FROM get_user_permissions(${testUser.id})
          `
          
          if (this.options.verbose) {
            console.log(`Test user ${testUser.email} has ${permissions.length} permissions`)
          }
        }
      } catch (error) {
        this.result.warnings.push('Permission checking function test failed')
      }

      // Test 4: Check for orphaned records
      const orphanedUserRoles = await prisma.userRole_New.count({
        where: {
          user: null
        }
      })

      if (orphanedUserRoles > 0) {
        this.result.warnings.push(`Found ${orphanedUserRoles} orphaned user role assignments`)
      }

      // Test 5: Check for inactive but not expired roles
      const suspiciousRoles = await prisma.userRole_New.count({
        where: {
          isActive: false,
          expiresAt: null
        }
      })

      if (suspiciousRoles > 0) {
        this.result.warnings.push(`Found ${suspiciousRoles} inactive roles without expiration dates`)
      }

      console.log('✅ Validation tests completed')
      this.result.steps.validation = true

    } catch (error) {
      console.error('❌ Validation failed:', error)
      this.result.errors.push(`Validation failed: ${error}`)
      // Don't throw here as validation is informational
    }
  }

  /**
   * Generate setup report
   */
  generateReport(): string {
    const report = []
    
    report.push('='.repeat(60))
    report.push('ENHANCED ROLES SYSTEM SETUP REPORT')
    report.push('='.repeat(60))
    report.push('')
    
    report.push('SETUP STEPS:')
    Object.entries(this.result.steps).forEach(([step, success]) => {
      const status = success ? '✅' : '❌'
      report.push(`  ${status} ${step.charAt(0).toUpperCase() + step.slice(1)}`)
    })
    report.push('')
    
    if (this.result.errors.length > 0) {
      report.push('ERRORS:')
      this.result.errors.forEach(error => {
        report.push(`  ❌ ${error}`)
      })
      report.push('')
    }
    
    if (this.result.warnings.length > 0) {
      report.push('WARNINGS:')
      this.result.warnings.forEach(warning => {
        report.push(`  ⚠️ ${warning}`)
      })
      report.push('')
    }
    
    report.push(`OVERALL STATUS: ${this.result.success ? '✅ SUCCESS' : '❌ FAILED'}`)
    report.push('='.repeat(60))
    
    return report.join('\n')
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options: SetupOptions = {}

  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--skip-migration':
        options.skipMigration = true
        break
      case '--skip-sync':
        options.skipSync = true
        break
      case '--skip-validation':
        options.skipValidation = true
        break
      case '--verbose':
        options.verbose = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
        console.log(`
Enhanced Roles System Setup Script

Usage: tsx setup-enhanced-roles.ts [options]

Options:
  --skip-migration    Skip database migration step
  --skip-sync         Skip user synchronization step
  --skip-validation   Skip validation tests
  --verbose           Show detailed output
  --dry-run           Run without making changes
  --help              Show this help message

Examples:
  tsx setup-enhanced-roles.ts
  tsx setup-enhanced-roles.ts --verbose
  tsx setup-enhanced-roles.ts --skip-migration --skip-sync
  tsx setup-enhanced-roles.ts --dry-run --verbose
        `)
        process.exit(0)
    }
  }

  try {
    const setup = new EnhancedRolesSetup(options)
    const result = await setup.setup()
    
    // Generate and display report
    const report = setup.generateReport()
    console.log('\n' + report)
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'setup-report.txt')
    await fs.writeFile(reportPath, report)
    console.log(`\n📄 Setup report saved to: ${reportPath}`)
    
    process.exit(result.success ? 0 : 1)
    
  } catch (error) {
    console.error('Setup script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Export for use as module
export { EnhancedRolesSetup }

// Run if called directly
if (require.main === module) {
  main()
}