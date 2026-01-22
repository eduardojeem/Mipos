import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
  console.log('🔍 Verificando estructura de tablas en Supabase...\n');

  try {
    // Verificar si existe la tabla user_roles
    const { data: userRolesTable, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);

    if (userRolesError) {
      console.log('❌ Tabla user_roles no existe o hay error:', userRolesError.message);
    } else {
      console.log('✅ Tabla user_roles existe');
      console.log('📊 Estructura detectada:', Object.keys(userRolesTable[0] || {}));
    }

    // Verificar si existe la tabla roles
    const { data: rolesTable, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(1);

    if (rolesError) {
      console.log('❌ Tabla roles no existe o hay error:', rolesError.message);
    } else {
      console.log('✅ Tabla roles existe');
      console.log('📊 Estructura detectada:', Object.keys(rolesTable[0] || {}));
    }

    // Verificar si existe la tabla permissions
    const { data: permissionsTable, error: permissionsError } = await supabase
      .from('permissions')
      .select('*')
      .limit(1);

    if (permissionsError) {
      console.log('❌ Tabla permissions no existe o hay error:', permissionsError.message);
    } else {
      console.log('✅ Tabla permissions existe');
      console.log('📊 Estructura detectada:', Object.keys(permissionsTable[0] || {}));
    }

    // Verificar si existe la tabla role_permissions
    const { data: rolePermissionsTable, error: rolePermissionsError } = await supabase
      .from('role_permissions')
      .select('*')
      .limit(1);

    if (rolePermissionsError) {
      console.log('❌ Tabla role_permissions no existe o hay error:', rolePermissionsError.message);
    } else {
      console.log('✅ Tabla role_permissions existe');
      console.log('📊 Estructura detectada:', Object.keys(rolePermissionsTable[0] || {}));
    }

    // Verificar la tabla users
    const { data: usersTable, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.log('❌ Tabla users no existe o hay error:', usersError.message);
    } else {
      console.log('✅ Tabla users existe');
      console.log('📊 Estructura detectada:', Object.keys(usersTable[0] || {}));
    }

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

checkTableStructure();