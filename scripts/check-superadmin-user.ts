import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSuperAdminUser(email: string) {
  console.log(`\n🔍 Verificando usuario: ${email}\n`);

  try {
    // 1. Buscar en auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error al obtener usuarios de auth:', authError);
      return;
    }

    const authUser = authUsers.users.find(u => u.email === email);
    
    if (!authUser) {
      console.error(`❌ Usuario no encontrado en auth.users con email: ${email}`);
      return;
    }

    console.log('✅ Usuario encontrado en auth.users:');
    console.log(`   - ID: ${authUser.id}`);
    console.log(`   - Email: ${authUser.email}`);
    console.log(`   - Email confirmado: ${authUser.email_confirmed_at ? 'Sí' : 'No'}`);
    console.log(`   - Creado: ${authUser.created_at}`);
    console.log(`   - Metadata:`, JSON.stringify(authUser.user_metadata, null, 2));
    console.log(`   - App Metadata:`, JSON.stringify(authUser.app_metadata, null, 2));

    // 2. Buscar en user_roles
    console.log('\n📋 Verificando tabla user_roles...');
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (roleError) {
      console.log(`⚠️  No se encontró en user_roles: ${roleError.message}`);
    } else {
      console.log('✅ Encontrado en user_roles:');
      console.log(`   - Role: ${userRole.role}`);
      console.log(`   - Datos completos:`, JSON.stringify(userRole, null, 2));
    }

    // 3. Buscar en users
    console.log('\n📋 Verificando tabla users...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (userError) {
      console.log(`⚠️  No se encontró en users: ${userError.message}`);
    } else {
      console.log('✅ Encontrado en users:');
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Datos completos:`, JSON.stringify(user, null, 2));
    }

    // 4. Resumen de verificación
    console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
    console.log('─────────────────────────────────────');
    
    const hasRoleInUserRoles = userRole?.role === 'SUPER_ADMIN';
    const hasRoleInUsers = user?.role === 'SUPER_ADMIN';
    const hasRoleInMetadata = authUser.user_metadata?.role === 'SUPER_ADMIN';
    const hasRoleInAppMetadata = authUser.app_metadata?.role === 'SUPER_ADMIN';

    console.log(`user_roles.role = SUPER_ADMIN: ${hasRoleInUserRoles ? '✅ SÍ' : '❌ NO'}`);
    console.log(`users.role = SUPER_ADMIN: ${hasRoleInUsers ? '✅ SÍ' : '❌ NO'}`);
    console.log(`user_metadata.role = SUPER_ADMIN: ${hasRoleInMetadata ? '✅ SÍ' : '❌ NO'}`);
    console.log(`app_metadata.role = SUPER_ADMIN: ${hasRoleInAppMetadata ? '✅ SÍ' : '❌ NO'}`);

    const canAccessSuperAdmin = hasRoleInUserRoles || hasRoleInUsers || hasRoleInMetadata;
    
    console.log('\n🎯 RESULTADO FINAL:');
    if (canAccessSuperAdmin) {
      console.log('✅ El usuario PUEDE acceder al panel de superadmin');
    } else {
      console.log('❌ El usuario NO PUEDE acceder al panel de superadmin');
      console.log('\n💡 SOLUCIÓN:');
      console.log('   Ejecuta uno de estos comandos para otorgar acceso:');
      console.log(`   1. Actualizar user_roles: npm run script scripts/set-superadmin-role.ts ${email}`);
      console.log(`   2. Actualizar users: npm run script scripts/update-user-role.ts ${email}`);
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Obtener email del argumento de línea de comandos
const email = process.argv[2] || 'jeem101595@gmail.com';

checkSuperAdminUser(email).then(() => {
  console.log('\n✅ Verificación completada\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
