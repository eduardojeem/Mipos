require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE URL or service role key');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log('🔎 Verificando acceso a public.role_audit_logs...');

  // Obtener un UUID válido de usuario para pruebas (FK)
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (usersErr) {
    console.error('❌ Error obteniendo usuarios:', usersErr);
    process.exit(1);
  }
  const testUserId = users?.[0]?.id;
  if (!testUserId) {
    console.error('❌ No se encontró ningún usuario para pruebas (users.id)');
    process.exit(1);
  }
  console.log('🆔 Usando user_id para prueba:', testUserId);

  // Test SELECT
  const { data, error } = await supabase
    .from('role_audit_logs')
    .select('id')
    .limit(1);

  if (error) {
    console.error('❌ Error de acceso:', error);
    process.exit(1);
  } else {
    console.log('✅ Acceso de lectura verificado.');
  }

  // Test INSERT (debe respetar FK y políticas)
  console.log('🧪 Insertando registro de prueba con resource_id UUID...');
  const uuidResourceId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null;
  const { data: insertDataUuid, error: insertErrorUuid } = await supabase
    .from('role_audit_logs')
    .insert([
      {
        user_id: testUserId,
        action: 'TEST',
        resource_type: 'roles',
        resource_id: uuidResourceId || testUserId, // usar UUID válido
        old_values: {},
        new_values: { changed: true },
        performed_by: testUserId,
        ip_address: '127.0.0.1',
        user_agent: 'verify-script',
      }
    ])
    .select();

  if (insertErrorUuid) {
    console.error('❌ Error insertando prueba con UUID:', insertErrorUuid);
    process.exit(1);
  } else {
    console.log('✅ Insert con UUID OK, id:', insertDataUuid?.[0]?.id);
  }

  // Test INSERT con resource_id NULL
  console.log('🧪 Insertando registro de prueba con resource_id NULL...');
  const { data: insertDataNull, error: insertErrorNull } = await supabase
    .from('role_audit_logs')
    .insert([
      {
        user_id: testUserId,
        action: 'TEST',
        resource_type: 'roles',
        resource_id: null,
        old_values: {},
        new_values: { changed: false },
        performed_by: testUserId,
        ip_address: '127.0.0.1',
        user_agent: 'verify-script',
      }
    ])
    .select();

  if (insertErrorNull) {
    console.error('❌ Error insertando prueba con NULL:', insertErrorNull);
    process.exit(1);
  } else {
    console.log('✅ Insert con NULL OK, id:', insertDataNull?.[0]?.id);
  }

  // Cleanup
  if (insertDataUuid?.[0]?.id) {
    await supabase
      .from('role_audit_logs')
      .delete()
      .eq('id', insertDataUuid[0].id);
    console.log('🧹 Registro de prueba (UUID) eliminado');
  }
  if (insertDataNull?.[0]?.id) {
    await supabase
      .from('role_audit_logs')
      .delete()
      .eq('id', insertDataNull[0].id);
    console.log('🧹 Registro de prueba (NULL) eliminado');
  }

  console.log('🎉 Verificación completada');
})();