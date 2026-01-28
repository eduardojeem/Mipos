import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndFixSuperAdmin() {
  try {
    console.log('🔍 Verificando usuarios en el sistema...\n');

    // 1. Obtener todos los usuarios de auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
      return;
    }

    console.log(`📋 Usuarios encontrados en auth: ${authUsers.users.length}\n`);

    for (const authUser of authUsers.users) {
      console.log(`\n👤 Usuario: ${authUser.email}`);
      console.log(`   ID: ${authUser.id}`);
      console.log(`   Metadata role: ${authUser.user_metadata?.role || 'no definido'}`);
      console.log(`   App metadata role: ${authUser.app_metadata?.role || 'no definido'}`);

      // 2. Verificar en tabla users
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', authUser.id)
        .single();

      if (dbError) {
        console.log(`   ⚠️  No existe en tabla users:`, dbError.message);
        
        // Crear usuario en tabla users con rol SUPER_ADMIN
        console.log(`   🔧 Creando usuario en tabla users con rol SUPER_ADMIN...`);
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Admin',
            role: 'SUPER_ADMIN',
            status: 'active',
            created_at: authUser.created_at,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.log(`   ❌ Error creando usuario:`, insertError.message);
        } else {
          console.log(`   ✅ Usuario creado con rol SUPER_ADMIN`);
        }
      } else {
        console.log(`   📊 Rol en DB: ${dbUser.role}`);
        
        // Si no es SUPER_ADMIN, actualizarlo
        if (dbUser.role !== 'SUPER_ADMIN') {
          console.log(`   🔧 Actualizando rol a SUPER_ADMIN...`);
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              role: 'SUPER_ADMIN',
              updated_at: new Date().toISOString()
            })
            .eq('id', authUser.id);

          if (updateError) {
            console.log(`   ❌ Error actualizando rol:`, updateError.message);
          } else {
            console.log(`   ✅ Rol actualizado a SUPER_ADMIN`);
          }
        } else {
          console.log(`   ✅ Ya tiene rol SUPER_ADMIN`);
        }
      }

      // 3. Actualizar user_metadata si es necesario
      if (authUser.user_metadata?.role !== 'SUPER_ADMIN') {
        console.log(`   🔧 Actualizando user_metadata...`);
        const { error: metaError } = await supabase.auth.admin.updateUserById(
          authUser.id,
          {
            user_metadata: {
              ...authUser.user_metadata,
              role: 'SUPER_ADMIN'
            }
          }
        );

        if (metaError) {
          console.log(`   ❌ Error actualizando metadata:`, metaError.message);
        } else {
          console.log(`   ✅ Metadata actualizado`);
        }
      }

      // 4. Verificar user_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_id, roles(name)')
        .eq('user_id', authUser.id);

      if (rolesError) {
        console.log(`   ⚠️  Error verificando user_roles:`, rolesError.message);
      } else {
        console.log(`   📋 Roles asignados:`, userRoles?.map((ur: any) => ur.roles?.name).join(', ') || 'ninguno');
        
        // Verificar si existe el rol SUPER_ADMIN en la tabla roles
        const { data: superAdminRole } = await supabase
          .from('roles')
          .select('id, name')
          .eq('name', 'SUPER_ADMIN')
          .single();

        if (superAdminRole && !userRoles?.some((ur: any) => ur.roles?.name === 'SUPER_ADMIN')) {
          console.log(`   🔧 Asignando rol SUPER_ADMIN en user_roles...`);
          const { error: assignError } = await supabase
            .from('user_roles')
            .upsert({
              user_id: authUser.id,
              role_id: superAdminRole.id
            }, {
              onConflict: 'user_id,role_id'
            });

          if (assignError) {
            console.log(`   ❌ Error asignando rol:`, assignError.message);
          } else {
            console.log(`   ✅ Rol SUPER_ADMIN asignado en user_roles`);
          }
        }
      }
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndFixSuperAdmin();
