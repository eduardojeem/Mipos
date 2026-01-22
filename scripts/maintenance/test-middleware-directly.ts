import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function testMiddlewareLogic() {
  try {
    console.log('🧪 Testing middleware logic directly...\n');

    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    
    // Simulate the exact middleware query
    console.log('1️⃣ Running exact middleware query...');
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

    console.log('✅ Query successful');
    console.log('User data:', {
      id: userData?.id,
      email: userData?.email,
      userRolesCount: userData?.userRoles?.length || 0
    });

    if (!userData) {
      console.log('❌ No user data found');
      return;
    }

    // Simulate the middleware transformation
    console.log('\n2️⃣ Transforming roles and permissions...');
    const roles = (userData.userRoles || []).map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      permissions: ur.role.permissions.map(rp => rp.permission)
    }));

    console.log(`Roles found: ${roles.length}`);
    roles.forEach(role => {
      console.log(`  - ${role.name}: ${role.permissions.length} permissions`);
    });

    // Flatten all permissions from all roles (remove duplicates)
    const allPermissions = new Map();
    roles.forEach(role => {
      role.permissions.forEach(permission => {
        allPermissions.set(permission.id, permission);
      });
    });

    const permissions = Array.from(allPermissions.values());
    console.log(`\nFlattened permissions: ${permissions.length}`);

    // Check for products:read permission specifically
    const productsReadPermission = permissions.find(p => 
      p.resource === 'products' && p.action === 'read'
    );

    console.log('\n3️⃣ Checking products:read permission...');
    if (productsReadPermission) {
      console.log('✅ products:read permission found:', productsReadPermission);
    } else {
      console.log('❌ products:read permission NOT found');
      console.log('Available permissions:');
      permissions.forEach(p => {
        console.log(`  - ${p.name}: ${p.resource}.${p.action}`);
      });
    }

    // Simulate the final user object
    const finalUser = {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName,
      roles,
      permissions
    };

    console.log('\n4️⃣ Final user object:');
    console.log('User permissions count:', finalUser.permissions.length);
    console.log('Has products:read?', finalUser.permissions.some(p => 
      p.resource === 'products' && p.action === 'read'
    ));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMiddlewareLogic();