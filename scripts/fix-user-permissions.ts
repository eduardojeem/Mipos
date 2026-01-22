#!/usr/bin/env node

/**
 * Simple script to fix user permissions by directly assigning ADMIN role
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixUserPermissions() {
  try {
    console.log('🔧 Fixing user permissions...')
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'jeem101595@gmail.com' },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      console.error('❌ User not found')
      return
    }

    console.log(`👤 Found user: ${user.email}`)
    console.log(`📋 Current roles: ${user.userRoles.length}`)

    // Find or create ADMIN role
    let adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    })

    if (!adminRole) {
      console.log('🔨 Creating ADMIN role...')
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          displayName: 'Administrator',
          description: 'System Administrator with full access'
        }
      })
    }

    // Check if user already has ADMIN role
    const existingRole = await prisma.userRole_New.findFirst({
      where: {
        userId: user.id,
        roleId: adminRole.id,
        isActive: true
      }
    })

    if (existingRole) {
      console.log('✅ User already has ADMIN role')
    } else {
      console.log('➕ Assigning ADMIN role to user...')
      await prisma.userRole_New.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
          assignedBy: 'system',
          isActive: true
        }
      })
      console.log('✅ ADMIN role assigned successfully')
    }

    // Ensure basic permissions exist for ADMIN role
    const permissions = [
      { resource: 'products', action: 'read' },
      { resource: 'products', action: 'create' },
      { resource: 'products', action: 'update' },
      { resource: 'products', action: 'delete' },
      { resource: 'inventory', action: 'read' },
      { resource: 'inventory', action: 'create' },
      { resource: 'inventory', action: 'update' },
      { resource: 'inventory', action: 'delete' },
      { resource: 'sales', action: 'read' },
      { resource: 'sales', action: 'create' },
      { resource: 'categories', action: 'read' },
      { resource: 'categories', action: 'create' },
      { resource: 'suppliers', action: 'read' },
      { resource: 'suppliers', action: 'create' },
      { resource: 'reports', action: 'read' },
      { resource: 'users', action: 'read' }
    ]

    console.log('🔑 Ensuring permissions exist...')
    for (const perm of permissions) {
      let permission = await prisma.permission.findFirst({
        where: {
          resource: perm.resource,
          action: perm.action
        }
      })

      if (!permission) {
        permission = await prisma.permission.create({
          data: {
            name: `${perm.resource}:${perm.action}`,
            displayName: `${perm.action} ${perm.resource}`,
            resource: perm.resource,
            action: perm.action,
            description: `${perm.action} access to ${perm.resource}`
          }
        })
      }

      // Assign permission to ADMIN role if not already assigned
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      })

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        })
      }
    }

    console.log('✅ All permissions assigned to ADMIN role')
    console.log('🎉 User permissions fixed successfully!')

  } catch (error) {
    console.error('❌ Error fixing user permissions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixUserPermissions()