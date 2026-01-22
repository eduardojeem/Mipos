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

async function debugAuthMiddleware() {
  try {
    console.log('🔍 Depurando middleware de autenticación...\n');

    // Simular el token del usuario actual
    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    
    console.log(`👤 Buscando usuario: ${userId}`);
    
    // Replicar exactamente la consulta del middleware
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

    console.log('📊 Datos del usuario encontrados:');
    console.log(JSON.stringify(userData, null, 2));

    if (userData) {
      // Transform roles and permissions data (como en el middleware)
      const roles = (userData.userRoles || []).map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.permissions.map(rp => rp.permission)
      }));

      console.log('\n🔐 Roles transformados:');
      console.log(JSON.stringify(roles, null, 2));

      // Flatten all permissions from all roles (remove duplicates)
      const allPermissions = new Map();
      roles.forEach(role => {
        role.permissions.forEach(permission => {
          allPermissions.set(permission.id, permission);
        });
      });

      const permissions = Array.from(allPermissions.values());

      console.log('\n✅ Permisos finales:');
      console.log(JSON.stringify(permissions, null, 2));

      // Verificar si tiene el permiso específico de products:read
      const hasProductsRead = permissions.some(
        permission => permission.resource === 'products' && permission.action === 'read'
      );

      console.log(`\n🎯 ¿Tiene permiso products:read? ${hasProductsRead ? '✅ SÍ' : '❌ NO'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuthMiddleware();