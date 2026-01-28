import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixSuperAdmin() {
  try {
    console.log('🔧 Asignando rol SUPER_ADMIN a todos los usuarios...\n');

    // Obtener todos los usuarios de auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios:', authError);
      return;
    }

    console.log(`📋 Usuarios encontrados: ${authUsers.users.length}\n`);

    for (const authUser of authUsers.users) {
      console.log(`\n👤 Procesando: ${authUser.email}`);
      console.log(`   ID: ${authUser.id}`);

      // 1. Insertar/actualizar en tabla users
      const insertData = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
        role: 'SUPER_ADMIN',
        created_at: authUser.created_at,
        updated_at: new Date().toISOString()
      };

      console.log(`   📝 Insertando en tabla users...`);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert(insertData, { onConflict: 'id' })
        .select()
        .single();

      if (userError) {
        console.log(`   ❌ Error en tabla users:`, userError.message);
      } else {
        console.log(`   ✅ Usuario en DB con rol: ${userData.role}`);
      }

      // 2. Actualizar user_metadata
      console.log(`   📝 Actualizando user_metadata...`);
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
        console.log(`   ❌ Error en metadata:`, metaError.message);
      } else {
        console.log(`   ✅ Metadata actualizado con rol SUPER_ADMIN`);
      }

      // 3. Verificar/crear rol SUPER_ADMIN en tabla roles
      const { data: superAdminRole, error: roleError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('name', 'SUPER_ADMIN')
        .single();

      if (roleError) {
        console.log(`   ⚠️  Rol SUPER_ADMIN no existe en tabla roles, creándolo...`);
        const { data: newRole, error: createRoleError } = await supabase
          .from('roles')
          .insert({
            name: 'SUPER_ADMIN',
            description: 'Super Administrador con acceso total',
            is_system_role: true,
            is_active: true
          })
          .select()
          .single();

        if (createRoleError) {
          console.log(`   ❌ Error creando rol:`, createRoleError.message);
          continue;
        } else {
          console.log(`   ✅ Rol SUPER_ADMIN creado`);
        }
      }

      // 4. Asignar rol en user_roles (solo si el usuario existe en users)
      if (userData) {
        const roleToAssign = superAdminRole || (await supabase
          .from('roles')
          .select('id')
          .eq('name', 'SUPER_ADMIN')
          .single()).data;

        if (roleToAssign) {
          console.log(`   📝 Asignando en user_roles...`);
          const { error: assignError } = await supabase
            .from('user_roles')
            .upsert({
              user_id: authUser.id,
              role_id: roleToAssign.id
            }, {
              onConflict: 'user_id,role_id'
            });

          if (assignError) {
            console.log(`   ❌ Error en user_roles:`, assignError.message);
          } else {
            console.log(`   ✅ Rol asignado en user_roles`);
          }
        }
      }
    }

    console.log('\n✅ Proceso completado. Por favor, cierra sesión y vuelve a iniciar sesión para que los cambios surtan efecto.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixSuperAdmin();
