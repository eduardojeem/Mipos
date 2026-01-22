import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function debugPermissionsDetailed() {
  try {
    console.log('🔍 Debugging permissions in detail...\n');

    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    
    // Step 1: Check if user exists
    console.log('1️⃣ Checking if user exists...');
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      fullName: user.fullName
    });

    // Step 2: Check user roles
    console.log('\n2️⃣ Checking user roles...');
    const userRoles = await prisma.userRole_New.findMany({
      where: { 
        userId: userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        role: true
      }
    });
    
    console.log(`Found ${userRoles.length} active roles:`);
    userRoles.forEach(ur => {
      console.log(`  - Role: ${ur.role.name} (ID: ${ur.role.id})`);
    });

    // Step 3: Check role permissions for each role
    console.log('\n3️⃣ Checking role permissions...');
    for (const userRole of userRoles) {
      console.log(`\nChecking permissions for role: ${userRole.role.name}`);
      
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { 
          roleId: userRole.role.id,
          isActive: true 
        },
        include: {
          permission: true
        }
      });
      
      console.log(`  Found ${rolePermissions.length} permissions:`);
      rolePermissions.forEach(rp => {
        console.log(`    - ${rp.permission.name}: ${rp.permission.resource}.${rp.permission.action}`);
      });
    }

    // Step 4: Test the exact query from middleware
    console.log('\n4️⃣ Testing exact middleware query...');
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        userRoles: {
          where: {
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  where: { isActive: true },
                  select: {
                    permission: {
                      select: {
                        id: true,
                        name: true,
                        resource: true,
                        action: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('\n📊 Middleware query result:');
    console.log('User data:', {
      id: userData?.id,
      email: userData?.email,
      userRolesCount: userData?.userRoles?.length || 0
    });

    if (userData?.userRoles) {
      userData.userRoles.forEach((ur, index) => {
        console.log(`Role ${index + 1}: ${ur.role.name}`);
        console.log(`  Permissions count: ${ur.role.permissions?.length || 0}`);
        if (ur.role.permissions) {
          ur.role.permissions.forEach(p => {
            console.log(`    - ${p.permission.name}: ${p.permission.resource}.${p.permission.action}`);
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPermissionsDetailed();