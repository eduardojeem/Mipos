import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkStructure() {
  console.log('\n🔍 Verificando estructura de user_roles\n');

  // Obtener un registro de ejemplo con JOIN a roles
  const { data: userRoleWithRole, error } = await supabase
    .from('user_roles')
    .select(`
      *,
      roles:role_id (
        id,
        name,
        description
      )
    `)
    .eq('user_id', 'bdda2721-4ffd-4c8a-ab4b-8b0c155a6395')
    .single();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Estructura de user_roles con JOIN:');
    console.log(JSON.stringify(userRoleWithRole, null, 2));
  }

  // Obtener todos los roles disponibles
  console.log('\n📋 Roles disponibles en la tabla roles:');
  const { data: allRoles, error: rolesError } = await supabase
    .from('roles')
    .select('*');

  if (rolesError) {
    console.error('❌ Error al obtener roles:', rolesError);
  } else {
    console.log(JSON.stringify(allRoles, null, 2));
  }
}

checkStructure().then(() => {
  console.log('\n✅ Verificación completada\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
