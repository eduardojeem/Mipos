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

async function setSuperAdminRole(email: string) {
  console.log(`\n🔧 Asignando rol SUPER_ADMIN a: ${email}\n`);

  try {
    // 1. Buscar usuario en auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error al obtener usuarios:', authError);
      return;
    }

    const authUser = authUsers.users.find(u => u.email === email);
    
    if (!authUser) {
      console.error(`❌ Usuario no encontrado: ${email}`);
      return;
    }

    console.log(`✅ Usuario encontrado: ${authUser.id}`);

    // 2. Actualizar en user_roles (crear o actualizar)
    console.log('\n📝 Actualizando user_roles...');
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (existingRole) {
      // Actualizar rol existente
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: 'SUPER_ADMIN', updated_at: new Date().toISOString() })
        .eq('user_id', authUser.id);

      if (updateError) {
        console.error('❌ Error al actualizar user_roles:', updateError);
      } else {
        console.log('✅ Rol actualizado en user_roles');
      }
    } else {
      // Crear nuevo registro
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authUser.id,
          role: 'SUPER_ADMIN',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error al insertar en user_roles:', insertError);
      } else {
        console.log('✅ Rol creado en user_roles');
      }
    }

    // 3. Actualizar en users (si existe la tabla)
    console.log('\n📝 Actualizando tabla users...');
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (existingUser) {
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ role: 'SUPER_ADMIN' })
        .eq('id', authUser.id);

      if (updateUserError) {
        console.error('❌ Error al actualizar users:', updateUserError);
      } else {
        console.log('✅ Rol actualizado en users');
      }
    } else {
      console.log('⚠️  Usuario no existe en tabla users (puede ser normal)');
    }

    // 4. Actualizar user_metadata en auth
    console.log('\n📝 Actualizando user_metadata...');
    const { error: metadataError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        user_metadata: {
          ...authUser.user_metadata,
          role: 'SUPER_ADMIN'
        }
      }
    );

    if (metadataError) {
      console.error('❌ Error al actualizar metadata:', metadataError);
    } else {
      console.log('✅ Metadata actualizado');
    }

    // 5. Verificar cambios
    console.log('\n🔍 Verificando cambios...');
    
    const { data: verifyRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authUser.id)
      .single();

    const { data: verifyUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single();

    console.log('\n📊 ESTADO FINAL:');
    console.log('─────────────────────────────────────');
    console.log(`user_roles.role: ${verifyRole?.role || 'N/A'}`);
    console.log(`users.role: ${verifyUser?.role || 'N/A'}`);
    console.log(`user_metadata.role: SUPER_ADMIN (actualizado)`);

    console.log('\n✅ Proceso completado exitosamente');
    console.log(`\n💡 El usuario ${email} ahora puede acceder a /superadmin`);
    console.log('   Nota: Es posible que necesite cerrar sesión y volver a iniciar sesión.');

  } catch (error) {
    console.error('❌ Error durante la asignación:', error);
  }
}

// Obtener email del argumento de línea de comandos
const email = process.argv[2];

if (!email) {
  console.error('❌ Debes proporcionar un email como argumento');
  console.log('\nUso: npm run script scripts/set-superadmin-role.ts <email>');
  console.log('Ejemplo: npm run script scripts/set-superadmin-role.ts jeem101595@gmail.com');
  process.exit(1);
}

setSuperAdminRole(email).then(() => {
  console.log('\n✅ Script finalizado\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
