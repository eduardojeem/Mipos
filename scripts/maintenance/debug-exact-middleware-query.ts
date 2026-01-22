import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function debugExactMiddlewareQuery() {
  try {
    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    console.log('🔍 Testing exact middleware query for user:', userId);

    // Enable Prisma query logging
    const prismaWithLogging = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });

    console.log('\n1️⃣ Running exact middleware query with logging...');
    const userData = await prismaWithLogging.user.findUnique({
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

    console.log('\n2️⃣ Query result:');
    console.log('User found:', !!userData);
    if (userData) {
      console.log('User ID:', userData.id);
      console.log('User email:', userData.email);
      console.log('User roles count:', userData.userRoles?.length || 0);
      
      if (userData.userRoles && userData.userRoles.length > 0) {
        userData.userRoles.forEach((ur, index) => {
          console.log(`Role ${index + 1}:`, {
            id: ur.role.id,
            name: ur.role.name,
            permissionsCount: ur.role.permissions.length
          });
          
          if (ur.role.permissions.length > 0) {
            console.log('  First few permissions:');
            ur.role.permissions.slice(0, 5).forEach(rp => {
              console.log(`    - ${rp.permission.name}: ${rp.permission.resource}.${rp.permission.action}`);
            });
          }
        });
      } else {
        console.log('❌ No user roles found in query result');
        
        // Let's check what the userRoles filter is doing
        console.log('\n3️⃣ Testing userRoles filter components...');
        
        // Test without any filters
        const userDataNoFilter = await prismaWithLogging.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            userRoles: {
              select: {
                isActive: true,
                expiresAt: true,
                role: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });
        
        console.log('User roles without filter:', userDataNoFilter?.userRoles?.length || 0);
        if (userDataNoFilter?.userRoles) {
          userDataNoFilter.userRoles.forEach(ur => {
            console.log(`  - Role: ${ur.role.name}, Active: ${ur.isActive}, Expires: ${ur.expiresAt}`);
          });
        }
        
        // Test with just isActive filter
        const userDataActiveOnly = await prismaWithLogging.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            userRoles: {
              where: {
                isActive: true
              },
              select: {
                isActive: true,
                expiresAt: true,
                role: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });
        
        console.log('User roles with isActive=true filter:', userDataActiveOnly?.userRoles?.length || 0);
        
        // Test the OR condition separately
        const currentDate = new Date();
        console.log('Current date for comparison:', currentDate.toISOString());
        
        const userDataWithOR = await prismaWithLogging.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            userRoles: {
              where: {
                isActive: true,
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: currentDate } }
                ]
              },
              select: {
                isActive: true,
                expiresAt: true,
                role: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });
        
        console.log('User roles with full filter:', userDataWithOR?.userRoles?.length || 0);
      }
    }

    await prismaWithLogging.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugExactMiddlewareQuery();