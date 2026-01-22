import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno (usa .env.local si existe)
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    const testEmail = process.env.TEST_USER_EMAIL || 'admin@test.com';
    const nowIso = new Date().toISOString();

    console.log('🔍 Probando filtro de user_roles is_active + expires_at...');
    console.log(`   📧 TEST_USER_EMAIL: ${testEmail}`);
    console.log(`   ⏱️ nowIso: ${nowIso}`);

    // Buscar usuario de prueba por email
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testEmail)
      .limit(1)
      .maybeSingle();

    if (userErr) {
      console.error('❌ Error buscando usuario:', userErr.message);
      process.exit(1);
    }

    if (!user?.id) {
      console.error('⚠️ No se encontró el usuario de prueba. Ajusta TEST_USER_EMAIL.');
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.email} (${user.id})`);

    // Consulta sin filtros (para comparar)
    const { data: allUserRoles, error: allErr } = await supabase
      .from('user_roles')
      .select('id, user_id, role_id, is_active, expires_at')
      .eq('user_id', user.id);

    if (allErr) {
      console.error('❌ Error consultando todos los user_roles:', allErr.message);
      process.exit(1);
    }

    console.log(`📊 Roles totales del usuario: ${allUserRoles?.length || 0}`);

    // Consulta con filtros de actividad y expiración (igual que en el middleware)
    const { data: activeValidRoles, error: activeErr } = await supabase
      .from('user_roles')
      .select('id, user_id, role_id, is_active, expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

    if (activeErr) {
      console.error('❌ Error consultando user_roles activos/vigentes:', activeErr.message);
      process.exit(1);
    }

    const expiredOrInactive = (allUserRoles || []).filter((r: any) => {
      const inactive = r.is_active === false;
      const expired = r.expires_at && new Date(r.expires_at).getTime() <= new Date(nowIso).getTime();
      return inactive || expired;
    });

    console.log(`✅ Roles activos y vigentes: ${activeValidRoles?.length || 0}`);
    console.log(`🚫 Roles inactivos o expirados: ${expiredOrInactive.length}`);

    if ((activeValidRoles?.length || 0) > 0) {
      console.log('🔐 Detalle de roles activos/vigentes:');
      (activeValidRoles || []).forEach((r: any) => {
        console.log(`   - id=${r.id} role_id=${r.role_id} is_active=${r.is_active} expires_at=${r.expires_at || 'null'}`);
      });
    } else {
      console.log('ℹ️ No hay roles activos/vigentes para el usuario de prueba.');
    }

    // Validación simple
    if ((activeValidRoles?.length || 0) <= (allUserRoles?.length || 0)) {
      console.log('✅ Filtro aplicado correctamente: reduce o iguala el conjunto de roles.');
    } else {
      console.warn('⚠️ Filtro inesperado: devolvió más roles que la consulta sin filtros. Revisa los datos.');
    }

  } catch (err) {
    console.error('💥 Error en la prueba:', (err as any)?.message || err);
    process.exit(1);
  }
}

main();