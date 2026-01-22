#!/usr/bin/env node

/**
 * Script para verificar permisos granulares en Supabase
 * 
 * Este script permite:
 * - Ver todos los roles y sus permisos granulares
 * - Verificar la estructura de permisos por recurso
 * - Mostrar la configuración completa del sistema de roles
 */

import * as dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

interface RoleWithPermissions {
  id: string
  name: string
  displayName: string
  description: string | null
  isSystemRole: boolean
  isActive: boolean
  permissions: Array<{
    id: string
    resource: string
    action: string
    description: string | null
  }>
}

interface PermissionsByResource {
  [resource: string]: Array<{
    action: string
    description: string | null
    roles: string[]
  }>
}

/**
 * Función principal para verificar permisos granulares
 */
async function checkDetailedPermissions(): Promise<void> {
  console.log('🔍 Verificando sistema de permisos granulares...\n')

  try {
    // 1. Obtener todos los roles con sus permisos
    const rolesWithPermissions = await getRolesWithPermissions()
    
    // 2. Mostrar información de roles
    console.log('📊 ROLES Y SUS PERMISOS:')
    console.log('=' .repeat(50))
    
    for (const role of rolesWithPermissions) {
      console.log(`\n👑 Rol: ${role.name}`)
      console.log(`   📝 Nombre: ${role.displayName}`)
      console.log(`   📄 Descripción: ${role.description || 'Sin descripción'}`)
      console.log(`   🔧 Sistema: ${role.isSystemRole ? 'Sí' : 'No'}`)
      console.log(`   ✅ Activo: ${role.isActive ? 'Sí' : 'No'}`)
      console.log(`   🔐 Permisos (${role.permissions.length}):`)
      
      if (role.permissions.length === 0) {
        console.log('      ⚠️  Sin permisos asignados')
      } else {
        const permissionsByResource = groupPermissionsByResource(role.permissions)
        
        for (const [resource, permissions] of Object.entries(permissionsByResource)) {
          console.log(`      📁 ${resource}:`)
          for (const perm of permissions) {
            console.log(`         • ${perm.action} - ${perm.description || 'Sin descripción'}`)
          }
        }
      }
    }

    // 3. Mostrar resumen por recursos
    console.log('\n\n📋 PERMISOS POR RECURSO:')
    console.log('=' .repeat(50))
    
    const allPermissionsByResource = await getPermissionsByResource()
    
    for (const [resource, permissions] of Object.entries(allPermissionsByResource)) {
      console.log(`\n📁 Recurso: ${resource}`)
      console.log(`   Acciones disponibles: ${permissions.length}`)
      
      for (const perm of permissions) {
        console.log(`   • ${perm.action}`)
        console.log(`     📄 ${perm.description || 'Sin descripción'}`)
        console.log(`     👥 Roles con acceso: ${perm.roles.join(', ') || 'Ninguno'}`)
      }
    }

    // 4. Estadísticas generales
    console.log('\n\n📊 ESTADÍSTICAS DEL SISTEMA:')
    console.log('=' .repeat(50))
    
    const stats = await getSystemStats()
    console.log(`Total de roles: ${stats.totalRoles}`)
    console.log(`Roles activos: ${stats.activeRoles}`)
    console.log(`Roles del sistema: ${stats.systemRoles}`)
    console.log(`Total de permisos: ${stats.totalPermissions}`)
    console.log(`Permisos activos: ${stats.activePermissions}`)
    console.log(`Recursos únicos: ${stats.uniqueResources}`)
    console.log(`Relaciones rol-permiso: ${stats.rolePermissionRelations}`)

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('❌ Error verificando permisos:', errorMessage)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Obtener todos los roles con sus permisos
 */
async function getRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  return roles.map(role => ({
    id: role.id.toString(),
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    isSystemRole: role.isSystemRole,
    isActive: role.isActive,
    permissions: role.permissions.map(rp => ({
      id: rp.permission.id.toString(),
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description
    }))
  }))
}

/**
 * Agrupar permisos por recurso
 */
function groupPermissionsByResource(permissions: Array<{ resource: string; action: string; description: string | null }>) {
  const grouped: { [resource: string]: Array<{ action: string; description: string | null }> } = {}
  
  for (const perm of permissions) {
    if (!grouped[perm.resource]) {
      grouped[perm.resource] = []
    }
    grouped[perm.resource].push({
      action: perm.action,
      description: perm.description
    })
  }
  
  return grouped
}

/**
 * Obtener permisos organizados por recurso con roles que los tienen
 */
async function getPermissionsByResource(): Promise<PermissionsByResource> {
  const permissions = await prisma.permission.findMany({
    include: {
      roles: {
        include: {
          role: true
        }
      }
    },
    orderBy: [
      { resource: 'asc' },
      { action: 'asc' }
    ]
  })

  const permissionsByResource: PermissionsByResource = {}

  for (const perm of permissions) {
    if (!permissionsByResource[perm.resource]) {
      permissionsByResource[perm.resource] = []
    }

    const rolesWithThisPermission = perm.roles
      .filter((rp: any) => rp.role.isActive)
      .map((rp: any) => rp.role.name)

    permissionsByResource[perm.resource].push({
      action: perm.action,
      description: perm.description,
      roles: rolesWithThisPermission
    })
  }

  return permissionsByResource
}

/**
 * Obtener estadísticas del sistema
 */
async function getSystemStats() {
  const [
    totalRoles,
    activeRoles,
    systemRoles,
    totalPermissions,
    activePermissions,
    uniqueResources,
    rolePermissionRelations
  ] = await Promise.all([
    prisma.role.count(),
    prisma.role.count({ where: { isActive: true } }),
    prisma.role.count({ where: { isSystemRole: true } }),
    prisma.permission.count(),
    prisma.permission.count({ where: { isActive: true } }),
    prisma.permission.groupBy({
      by: ['resource'],
      _count: { resource: true }
    }).then(result => result.length),
    prisma.rolePermission.count()
  ])

  return {
    totalRoles,
    activeRoles,
    systemRoles,
    totalPermissions,
    activePermissions,
    uniqueResources,
    rolePermissionRelations
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  await checkDetailedPermissions()
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('❌ Error ejecutando script:', errorMessage)
    process.exit(1)
  })
}

export { checkDetailedPermissions }