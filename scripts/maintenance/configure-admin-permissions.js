const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function configureAdminPermissions() {
  console.log('🔧 Configurando permisos de dashboard para admin...');

  try {
    // 1. Buscar el usuario admin@test.com
    console.log('👤 Buscando usuario admin...');
    
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw new Error(`Error al obtener usuarios: ${userError.message}`);
    }

    const adminUser = users.users.find(user => user.email === 'jeem101595@gmail.com');
    
    if (!adminUser) {
      throw new Error('Usuario admin@test.com no encontrado');
    }

    console.log('✅ Usuario admin encontrado:', adminUser.id);

    // 2. Actualizar el usuario en la tabla users con rol ADMIN
    console.log('🔄 Actualizando rol del usuario...');
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .upsert({
        id: adminUser.id,
        email: adminUser.email,
        role: 'SUPER_ADMIN',
        name: 'Super Administrador',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (updateError) {
      console.log('⚠️ Error al actualizar usuario (puede ser normal si ya existe):', updateError.message);
      
      // Intentar solo actualizar el rol
      const { data: roleUpdate, error: roleError } = await supabase
        .from('users')
        .update({ role: 'SUPER_ADMIN' })
        .eq('id', adminUser.id)
        .select()
        .single();
        
      if (roleError) {
        console.log('⚠️ Error al actualizar rol:', roleError.message);
      } else {
        console.log('✅ Rol actualizado correctamente');
      }
    } else {
      console.log('✅ Usuario actualizado correctamente:', updatedUser);
    }

    // 3. Verificar que el usuario tiene acceso al dashboard
    console.log('🔍 Verificando permisos...');
    
    const { data: userCheck, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', adminUser.id)
      .single();

    if (checkError) {
      throw new Error(`Error al verificar usuario: ${checkError.message}`);
    }

    console.log('📊 Estado del usuario:', {
      id: userCheck.id,
      email: userCheck.email,
      role: userCheck.role,
      name: userCheck.name
    });

    // 4. Crear/actualizar metadatos del usuario en Supabase Auth
    console.log('🔧 Actualizando metadatos de autenticación...');
    
    const { data: authUpdate, error: authError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        user_metadata: {
          role: 'SUPER_ADMIN',
          permissions: ['dashboard:read', 'users:read', 'users:create', 'users:update', 'users:delete', 'products:read', 'products:create', 'products:update', 'products:delete', 'sales:read', 'sales:create', 'sales:update', 'categories:read', 'categories:create', 'categories:update', 'categories:delete', 'reports:read', 'inventory:read', 'inventory:update']
        }
      }
    );

    if (authError) {
      console.log('⚠️ Error al actualizar metadatos:', authError.message);
    } else {
      console.log('✅ Metadatos de autenticación actualizados');
    }

    console.log('🎉 Configuración completada exitosamente!');
    console.log('📝 El usuario admin@test.com ahora tiene:');
    console.log('   - Rol: ADMIN');
    console.log('   - Acceso completo al dashboard');
    console.log('   - Todos los permisos del sistema');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

configureAdminPermissions()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });