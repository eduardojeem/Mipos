import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugMiddlewareExecution() {
  try {
    console.log('🔍 Debugging middleware execution with real token...\n');

    // Get a real token from Supabase (simulate what happens in the middleware)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('❌ No authenticated user found');
      return;
    }

    console.log('1️⃣ Supabase user found:', {
      id: user.id,
      email: user.email
    });

    // Now test the Prisma query with this user ID
    console.log('\n2️⃣ Running Prisma query...');
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
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

    if (!userData) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('✅ User found in database:', {
      id: userData.id,
      email: userData.email,
      userRolesCount: userData.userRoles?.length || 0
    });

    // Transform roles and permissions data (exact middleware logic)
    console.log('\n3️⃣ Transforming data...');
    const roles = (userData.userRoles || []).map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      permissions: ur.role.permissions.map(rp => rp.permission)
    }));

    console.log(`Roles: ${roles.length}`);
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

    // Check for products:read specifically
    const hasProductsRead = permissions.some(p => 
      p.resource === 'products' && p.action === 'read'
    );

    console.log('\n4️⃣ Permission check result:');
    console.log(`Has products:read permission: ${hasProductsRead}`);

    if (!hasProductsRead) {
      console.log('Available permissions:');
      permissions.slice(0, 10).forEach(p => {
        console.log(`  - ${p.name}: ${p.resource}.${p.action}`);
      });
    }

    // Final user object that would be attached to req.user
    const finalUser = {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName,
      roles,
      permissions
    };

    console.log('\n5️⃣ Final req.user object:');
    console.log('Permissions array length:', finalUser.permissions.length);
    console.log('First few permissions:', finalUser.permissions.slice(0, 5).map(p => `${p.resource}.${p.action}`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMiddlewareExecution();