import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserPermissions() {
  try {
    console.log('🔍 Checking current user and role status...');
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'jeem101595@gmail.com' },
      include: {
        userRoles: {
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
    });

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('📋 Current roles:', user.userRoles.length);

    // Check if ADMIN role exists
    let adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!adminRole) {
      console.log('🔧 Creating ADMIN role...');
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          displayName: 'Administrator',
          description: 'Full system administrator'
        },
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      });
    }

    console.log('✅ ADMIN role exists:', adminRole.name);
    console.log('📋 Role permissions:', adminRole.permissions.length);

    // Define required permissions
    const requiredPermissions = [
      { name: 'products:read', resource: 'products', action: 'read', displayName: 'Read Products' },
      { name: 'products:write', resource: 'products', action: 'write', displayName: 'Write Products' },
      { name: 'products:delete', resource: 'products', action: 'delete', displayName: 'Delete Products' },
      { name: 'inventory:read', resource: 'inventory', action: 'read', displayName: 'Read Inventory' },
      { name: 'inventory:write', resource: 'inventory', action: 'write', displayName: 'Write Inventory' },
      { name: 'sales:read', resource: 'sales', action: 'read', displayName: 'Read Sales' },
      { name: 'sales:write', resource: 'sales', action: 'write', displayName: 'Write Sales' },
      { name: 'users:read', resource: 'users', action: 'read', displayName: 'Read Users' },
      { name: 'users:write', resource: 'users', action: 'write', displayName: 'Write Users' },
      { name: 'reports:read', resource: 'reports', action: 'read', displayName: 'Read Reports' }
    ];

    // Create permissions if they don't exist
    for (const permData of requiredPermissions) {
      let permission = await prisma.permission.findUnique({
        where: { name: permData.name }
      });

      if (!permission) {
        console.log(`🔧 Creating permission: ${permData.name}`);
        permission = await prisma.permission.create({
          data: permData
        });
      }

      // Check if role has this permission
      const rolePermission = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        }
      });

      if (!rolePermission) {
        console.log(`🔧 Assigning permission ${permData.name} to ADMIN role`);
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
      }
    }

    // Check if user has ADMIN role
    const userRole = await prisma.userRole_New.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRole.id
        }
      }
    });

    if (!userRole) {
      console.log('🔧 Assigning ADMIN role to user...');
      await prisma.userRole_New.create({
        data: {
          userId: user.id,
          roleId: adminRole.id
        }
      });
    }

    console.log('✅ User permissions fixed successfully!');

    // Verify the final state
    const updatedUser = await prisma.user.findUnique({
      where: { email: 'jeem101595@gmail.com' },
      include: {
        userRoles: {
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
    });

    console.log('🎉 Final verification:');
    console.log('- User roles:', updatedUser?.userRoles.length);
    console.log('- Total permissions:', updatedUser?.userRoles.reduce((acc, ur) => acc + ur.role.permissions.length, 0));

  } catch (error) {
    console.error('❌ Error fixing user permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserPermissions();