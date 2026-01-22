import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function debugDatabaseConnection() {
  const directPrisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing direct Prisma client connection...');
    
    // Test basic connection
    await directPrisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test user query
    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    const user = await directPrisma.user.findUnique({
      where: { id: userId }
    });
    
    if (user) {
      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      });
    } else {
      console.log('❌ User not found');
      return;
    }
    
    // Test user roles query
    console.log('\n🔍 Testing user roles query...');
    const userWithRoles = await directPrisma.user.findUnique({
      where: { id: userId },
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
    
    if (userWithRoles) {
      console.log('✅ User with roles found');
      console.log('User roles count:', userWithRoles.userRoles.length);
      
      userWithRoles.userRoles.forEach((ur, index) => {
        console.log(`Role ${index + 1}:`, {
          name: ur.role.name,
          isActive: ur.isActive,
          expiresAt: ur.expiresAt,
          permissionsCount: ur.role.permissions.length
        });
        
        if (ur.role.permissions.length > 0) {
          console.log('  Sample permissions:');
          ur.role.permissions.slice(0, 3).forEach(rp => {
            console.log(`    - ${rp.permission.name}: ${rp.permission.resource}.${rp.permission.action}`);
          });
        }
      });
    }
    
    // Test the exact middleware query structure
    console.log('\n🔍 Testing exact middleware query structure...');
    const middlewareQuery = await directPrisma.user.findUnique({
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
    console.log('User roles count:', middlewareQuery?.userRoles?.length || 0);
    
    if (middlewareQuery?.userRoles && middlewareQuery.userRoles.length > 0) {
      middlewareQuery.userRoles.forEach((ur, index) => {
        console.log(`Role ${index + 1}:`, {
          id: ur.role.id,
          name: ur.role.name,
          permissionsCount: ur.role.permissions.length
        });
      });
    } else {
      console.log('❌ No roles found in middleware query');
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await directPrisma.$disconnect();
  }
}

debugDatabaseConnection();