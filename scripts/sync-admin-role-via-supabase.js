const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: 'apps/frontend/.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const userId = process.env.SYNC_USER_ID || 'auto-detect';
  const email = process.env.SYNC_EMAIL || 'jeem101595@gmail.com';

  console.log('🔄 Sincronizando usuario y rol ADMIN vía Supabase REST...');
  console.log(`📧 Email: ${email}`);

  // Obtener el ID del usuario desde Supabase Auth
  let actualUserId = process.env.SYNC_USER_ID;
  if (!actualUserId || actualUserId === 'auto-detect') {
    console.log('🔍 Obteniendo ID del usuario desde Supabase Auth...');
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
      console.log('⚠️ Error obteniendo usuarios de Auth:', authErr.message);
    } else {
      const authUser = authUsers.users.find(u => u.email === email);
      if (authUser) {
        actualUserId = authUser.id;
        console.log(`✅ Usuario encontrado en Auth: ${actualUserId}`);
      } else {
        console.log('❌ Usuario no encontrado en Supabase Auth');
        process.exit(1);
      }
    }
  }

  console.log(`🆔 Usuario: ${actualUserId}`);

  // 1) Asegurar usuario en tabla local `users`
  const { data: foundUsers, error: searchErr } = await supabase
    .from('users')
    .select('*')
    .or(`id.eq.${actualUserId},email.eq.${email}`)
    .limit(1);

  if (searchErr) console.log('⚠️ Error buscando usuario local:', searchErr.message);
  let localUser = foundUsers?.[0];

  if (!localUser) {
    console.log('➕ Creando usuario en `users`');
    const { error: insertErr } = await supabase
      .from('users')
      .insert({ id: actualUserId, email, fullName: 'Eduardo Espinoza', role: 'ADMIN' });
    if (insertErr) console.log('⚠️ Error creando usuario:', insertErr.message);
    else console.log('✅ Usuario creado');
  } else if (localUser.id !== actualUserId) {
    console.log('🔄 Actualizando ID del usuario local');
    const { error: updateErr } = await supabase
      .from('users')
      .update({ id: actualUserId })
      .eq('id', localUser.id);
    if (updateErr) console.log('⚠️ Error actualizando ID:', updateErr.message);
    else console.log('✅ ID actualizado');
  } else {
    console.log('✅ Usuario ya existe en `users`');
  }

  // 2) Asegurar rol ADMIN en `roles`
  const { data: adminRoleRows, error: roleErr } = await supabase
    .from('roles')
    .select('id, name')
    .eq('name', 'ADMIN')
    .limit(1);
  if (roleErr) console.log('⚠️ Error consultando rol ADMIN:', roleErr.message);
  let adminRoleId = adminRoleRows?.[0]?.id;
  if (!adminRoleId) {
    console.log('➕ Creando rol ADMIN');
    const { data: createdRole, error: createRoleErr } = await supabase
      .from('roles')
      .insert({ name: 'ADMIN', display_name: 'Administrador', description: 'Acceso completo al sistema', is_system_role: true, is_active: true })
      .select('id')
      .limit(1);
    if (createRoleErr) console.log('⚠️ Error creando rol ADMIN:', createRoleErr.message);
    adminRoleId = createdRole?.[0]?.id;
  } else {
    console.log('✅ Rol ADMIN existe');
  }

  // 3) Asignar rol ADMIN al usuario (user_roles)
  if (adminRoleId) {
    console.log('🔐 Asignando rol ADMIN al usuario...');
    const { error: upsertErr } = await supabase
      .from('user_roles')
      .upsert({ user_id: actualUserId, role_id: adminRoleId, assigned_at: new Date().toISOString(), assigned_by: 'sync-script', is_active: true }, { onConflict: 'user_id,role_id' });
    if (upsertErr) console.log('⚠️ Error asignando rol:', upsertErr.message);
    else console.log('✅ Rol ADMIN asignado');
  } else {
    console.log('❌ No se pudo determinar el ID del rol ADMIN');
  }

  // 4) Verificación rápida
  const { data: userRoles, error: viewErr } = await supabase
    .from('user_roles')
    .select('user_id, role_id')
    .eq('user_id', actualUserId)
    .limit(5);
  if (viewErr) console.log('⚠️ Error verificando roles del usuario:', viewErr.message);
  else console.log('👀 Roles del usuario:', userRoles);

  console.log('🎉 Sincronización vía Supabase REST finalizada.');
}

main().catch((err) => { console.error('❌ Error:', err); process.exit(1); });