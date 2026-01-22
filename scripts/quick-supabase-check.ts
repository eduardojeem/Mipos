import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickCheck() {
  console.log('🔍 VERIFICACIÓN RÁPIDA DEL ESTADO DE SUPABASE');
  console.log('============================================');
  
  const checks = [
    { name: 'Roles', table: 'roles' },
    { name: 'Permisos', table: 'permissions' },
    { name: 'Categorías', table: 'categories' },
    { name: 'Proveedores', table: 'suppliers' },
    { name: 'Clientes', table: 'customers' }
  ];

  let totalRecords = 0;
  let successfulChecks = 0;

  for (const check of checks) {
    try {
      const { data, error } = await supabase
        .from(check.table)
        .select('*', { count: 'exact' });

      if (error) {
        console.log(`❌ ${check.name}: ERROR - ${error.message}`);
      } else {
        const count = data?.length || 0;
        totalRecords += count;
        successfulChecks++;
        console.log(`✅ ${check.name}: ${count} registros`);
      }
    } catch (err) {
      console.log(`❌ ${check.name}: EXCEPCIÓN - ${err}`);
    }
  }

  console.log('\n📊 RESUMEN:');
  console.log(`✅ Tablas accesibles: ${successfulChecks}/${checks.length}`);
  console.log(`📋 Total de registros: ${totalRecords}`);
  
  if (successfulChecks === checks.length && totalRecords > 0) {
    console.log('🟢 ESTADO: SISTEMA OPERATIVO');
    console.log('✨ La configuración manual ya fue completada exitosamente');
    return true;
  } else if (successfulChecks === checks.length && totalRecords === 0) {
    console.log('🟡 ESTADO: TABLAS CREADAS PERO SIN DATOS');
    console.log('⚠️  Necesitas ejecutar: scripts/supabase-sql-direct.sql');
    return false;
  } else {
    console.log('🔴 ESTADO: CONFIGURACIÓN MANUAL REQUERIDA');
    console.log('📋 Sigue los pasos en CONFIGURACION-URGENTE.md');
    return false;
  }
}

quickCheck().catch(console.error);