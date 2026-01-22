import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAuthMiddleware() {
  console.log('🔍 Probando el middleware de autenticación...\n');

  try {
    // Simular la consulta que hace el middleware enhanced-auth
    const { data: userData, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        fullName,
        role,
        userRoles:user_roles(
          id,
          isActive,
          assignedAt,
          role:roles(
            id,
            name,
            displayName,
            description,
            permissions:role_permissions(
              permission:permissions(
                id,
                name,
                resource,
                action,
                description
              )
            )
          )
        )
      `)
      .eq('email', 'admin@test.com')
      .eq('userRoles.isActive', true)
      .single();

    if (error) {
      console.error('❌ Error en la consulta:', error);
      return;
    }

    console.log('✅ Consulta exitosa!');
    console.log('📊 Datos del usuario:', JSON.stringify(userData, null, 2));

    // Verificar estructura de roles
    if (userData.userRoles && userData.userRoles.length > 0) {
      console.log('\n🎭 Roles encontrados:');
      userData.userRoles.forEach((userRole: any, index: number) => {
        console.log(`   ${index + 1}. ${userRole.role.displayName} (${userRole.role.name})`);
        console.log(`      📝 ${userRole.role.description}`);
        console.log(`      🔐 Permisos: ${userRole.role.permissions?.length || 0}`);
        
        if (userRole.role.permissions && userRole.role.permissions.length > 0) {
          console.log('      📋 Lista de permisos:');
          userRole.role.permissions.forEach((perm: any) => {
            console.log(`         - ${perm.permission.resource}.${perm.permission.action}`);
          });
        }
      });
    } else {
      console.log('⚠️  No se encontraron roles activos para este usuario');
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

testAuthMiddleware();