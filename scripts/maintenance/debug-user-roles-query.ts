import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function debugUserRolesQuery() {
  try {
    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    console.log('🔍 Debugging user roles query for user:', userId);

    // First, check if user exists
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

    // Check all user roles without filters
    console.log('\n1️⃣ All user roles (no filters):');
    const allUserRoles = await prisma.userRole_New.findMany({
      where: { userId: userId },
      include: {
        role: true
      }
    });

    console.log(`Found ${allUserRoles.length} user roles:`);
    allUserRoles.forEach(ur => {
      console.log(`  - Role: ${ur.role.name}, Active: ${ur.isActive}, Expires: ${ur.expiresAt}`);
    });

    // Check with isActive filter
    console.log('\n2️⃣ Active user roles only:');
    const activeUserRoles = await prisma.userRole_New.findMany({
      where: { 
        userId: userId,
        isActive: true
      },
      include: {
        role: true
      }
    });

    console.log(`Found ${activeUserRoles.length} active user roles:`);
    activeUserRoles.forEach(ur => {
      console.log(`  - Role: ${ur.role.name}, Active: ${ur.isActive}, Expires: ${ur.expiresAt}`);
    });

    // Check with full middleware filter
    console.log('\n3️⃣ Middleware filter (active + not expired):');
    const middlewareUserRoles = await prisma.userRole_New.findMany({
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

    console.log(`Found ${middlewareUserRoles.length} middleware-filtered user roles:`);
    middlewareUserRoles.forEach(ur => {
      console.log(`  - Role: ${ur.role.name}, Active: ${ur.isActive}, Expires: ${ur.expiresAt}`);
    });

    // Test the exact middleware query
    console.log('\n4️⃣ Exact middleware query:');
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

    console.log('Middleware query result:');
    console.log(`  - User roles count: ${userData?.userRoles?.length || 0}`);
    if (userData?.userRoles) {
      userData.userRoles.forEach(ur => {
        console.log(`    - Role: ${ur.role.name}, Permissions: ${ur.role.permissions.length}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserRolesQuery();