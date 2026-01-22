const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupRolesAndPermissions() {
  console.log('🔧 Configurando roles y permisos...');

  try {
    // 1. Crear roles básicos
    console.log('👥 Creando roles...');
    
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        displayName: 'Administrador',
        description: 'Acceso completo al sistema'
      }
    });

    const cashierRole = await prisma.role.upsert({
      where: { name: 'CASHIER' },
      update: {},
      create: {
        name: 'CASHIER',
        displayName: 'Cajero',
        description: 'Acceso limitado para ventas y consultas'
      }
    });

    console.log('✅ Roles creados:', { admin: adminRole.id, cashier: cashierRole.id });

    // 2. Crear permisos básicos
    console.log('🔐 Creando permisos...');
    
    const permissions = [
      // Productos
      { name: 'products:read', displayName: 'Ver Productos', description: 'Consultar productos', resource: 'products', action: 'read' },
      { name: 'products:create', displayName: 'Crear Productos', description: 'Crear nuevos productos', resource: 'products', action: 'create' },
      { name: 'products:update', displayName: 'Actualizar Productos', description: 'Modificar productos existentes', resource: 'products', action: 'update' },
      { name: 'products:delete', displayName: 'Eliminar Productos', description: 'Eliminar productos', resource: 'products', action: 'delete' },
      
      // Categorías
      { name: 'categories:read', displayName: 'Ver Categorías', description: 'Consultar categorías', resource: 'categories', action: 'read' },
      { name: 'categories:create', displayName: 'Crear Categorías', description: 'Crear nuevas categorías', resource: 'categories', action: 'create' },
      { name: 'categories:update', displayName: 'Actualizar Categorías', description: 'Modificar categorías', resource: 'categories', action: 'update' },
      { name: 'categories:delete', displayName: 'Eliminar Categorías', description: 'Eliminar categorías', resource: 'categories', action: 'delete' },
      
      // Ventas
      { name: 'sales:read', displayName: 'Ver Ventas', description: 'Consultar ventas', resource: 'sales', action: 'read' },
      { name: 'sales:create', displayName: 'Crear Ventas', description: 'Realizar ventas', resource: 'sales', action: 'create' },
      { name: 'sales:update', displayName: 'Actualizar Ventas', description: 'Modificar ventas', resource: 'sales', action: 'update' },
      { name: 'sales:delete', displayName: 'Eliminar Ventas', description: 'Eliminar ventas', resource: 'sales', action: 'delete' },
      
      // Usuarios
      { name: 'users:read', displayName: 'Ver Usuarios', description: 'Consultar usuarios', resource: 'users', action: 'read' },
      { name: 'users:create', displayName: 'Crear Usuarios', description: 'Crear nuevos usuarios', resource: 'users', action: 'create' },
      { name: 'users:update', displayName: 'Actualizar Usuarios', description: 'Modificar usuarios', resource: 'users', action: 'update' },
      { name: 'users:delete', displayName: 'Eliminar Usuarios', description: 'Eliminar usuarios', resource: 'users', action: 'delete' },
      
      // Dashboard
      { name: 'dashboard:read', displayName: 'Ver Dashboard', description: 'Acceso al dashboard', resource: 'dashboard', action: 'read' },
      
      // Inventario
      { name: 'inventory:read', displayName: 'Ver Inventario', description: 'Consultar inventario', resource: 'inventory', action: 'read' },
      { name: 'inventory:update', displayName: 'Actualizar Inventario', description: 'Modificar inventario', resource: 'inventory', action: 'update' },
      
      // Reportes
      { name: 'reports:read', displayName: 'Ver Reportes', description: 'Generar reportes', resource: 'reports', action: 'read' },

      // Caja (cash)
      { name: 'cash:read', displayName: 'Ver Caja', description: 'Consultar sesión y movimientos de caja', resource: 'cash', action: 'read' },
      { name: 'cash:open', displayName: 'Abrir Caja', description: 'Abrir sesión de caja', resource: 'cash', action: 'open' },
      { name: 'cash:close', displayName: 'Cerrar Caja', description: 'Cerrar sesión de caja', resource: 'cash', action: 'close' },
      { name: 'cash:move', displayName: 'Movimientos de Caja', description: 'Registrar movimientos de caja', resource: 'cash', action: 'move' }
    ];

    const createdPermissions = [];
    for (const perm of permissions) {
      const permission = await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm
      });
      createdPermissions.push(permission);
    }

    console.log(`✅ ${createdPermissions.length} permisos creados`);

    // 3. Asignar permisos a roles
    console.log('🔗 Asignando permisos a roles...');

    // ADMIN: todos los permisos
    for (const permission of createdPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      });
    }

    // CASHIER: permisos limitados
    const cashierPermissions = [
      'products:read',
      'categories:read',
      'sales:read',
      'sales:create',
      'dashboard:read',
      'inventory:read',
      // Caja para cajero
      'cash:read',
      'cash:open',
      'cash:close',
      'cash:move'
    ];

    for (const permName of cashierPermissions) {
      const permission = createdPermissions.find(p => p.name === permName);
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: cashierRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: cashierRole.id,
            permissionId: permission.id
          }
        });
      }
    }

    console.log('✅ Permisos asignados a roles');

    // 4. Asignar roles a usuarios existentes
    console.log('👤 Asignando roles a usuarios...');

    const adminUser = await prisma.user.findUnique({
      where: { email: 'jeem101595@gmail.com' }
    });

    const cashierUser = await prisma.user.findUnique({
      where: { email: 'cashier@example.com' }
    });

    if (adminUser) {
      await prisma.userRole_New.upsert({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: adminRole.id
          }
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: adminRole.id
        }
      });
      console.log('✅ Rol ADMIN asignado a jeem101595@gmail.com');
    }

    if (cashierUser) {
      await prisma.userRole_New.upsert({
        where: {
          userId_roleId: {
            userId: cashierUser.id,
            roleId: cashierRole.id
          }
        },
        update: {},
        create: {
          userId: cashierUser.id,
          roleId: cashierRole.id
        }
      });
      console.log('✅ Rol CASHIER asignado a cashier@example.com');
    }

    // 5. Verificar configuración
    console.log('\n📊 Verificando configuración...');
    
    const roleCount = await prisma.role.count();
    const permissionCount = await prisma.permission.count();
    const rolePermissionCount = await prisma.rolePermission.count();
    const userRoleCount = await prisma.userRole_New.count();

    console.log(`🎭 Roles: ${roleCount}`);
    console.log(`🔐 Permisos: ${permissionCount}`);
    console.log(`🔗 Asignaciones rol-permiso: ${rolePermissionCount}`);
    console.log(`👤 Asignaciones usuario-rol: ${userRoleCount}`);

    console.log('\n🎉 Configuración de roles y permisos completada!');

  } catch (error) {
    console.error('❌ Error configurando roles y permisos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupRolesAndPermissions()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });