import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function debugRelationName() {
  try {
    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    console.log('🔍 Testing relation names for user:', userId);

    // Test 1: Using userRoles (as in middleware)
    console.log('\n1️⃣ Testing userRoles relation:');
    try {
      const result1 = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userRoles: {
            select: {
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });
      console.log('✅ userRoles works:', result1?.userRoles?.length || 0, 'roles found');
    } catch (error) {
      console.log('❌ userRoles failed:', (error as Error).message);
    }

    // Test 2: Using UserRole_New directly
    console.log('\n2️⃣ Testing direct UserRole_New query:');
    try {
      const result2 = await prisma.userRole_New.findMany({
        where: { userId: userId },
        select: {
          role: {
            select: {
              name: true
            }
          }
        }
      });
      console.log('✅ Direct UserRole_New works:', result2.length, 'roles found');
    } catch (error) {
      console.log('❌ Direct UserRole_New failed:', (error as Error).message);
    }

    // Test 3: Check if there's a different relation name
    console.log('\n3️⃣ Testing user object structure:');
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    console.log('User object keys:', Object.keys(user || {}));

    // Test 4: Try to include all possible relations
    console.log('\n4️⃣ Testing all user relations:');
    try {
      const userWithAllRelations = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: true,
          assignedRoles: true,
          grantedPermissions: true,
          sessions: true,
          auditLogs_role: true,
          performedAudits: true
        }
      });
      console.log('Relations found:');
      console.log('  - userRoles:', userWithAllRelations?.userRoles?.length || 0);
      console.log('  - assignedRoles:', userWithAllRelations?.assignedRoles?.length || 0);
      console.log('  - grantedPermissions:', userWithAllRelations?.grantedPermissions?.length || 0);
      console.log('  - sessions:', userWithAllRelations?.sessions?.length || 0);
      console.log('  - auditLogs_role:', userWithAllRelations?.auditLogs_role?.length || 0);
      console.log('  - performedAudits:', userWithAllRelations?.performedAudits?.length || 0);
    } catch (error) {
      console.log('❌ Include all relations failed:', (error as Error).message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRelationName();