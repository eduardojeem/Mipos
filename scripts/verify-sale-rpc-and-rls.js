// Verifica tipos, función RPC create_sale_with_items, grants y políticas RLS
// Usa exec_sql (versión JSON) para consultar catálogo

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar env: prioriza .env.local
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function execSqlJson(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    throw new Error(error.message || String(error));
  }
  if (!data || typeof data !== 'object') return null;
  if (data.status && data.status === 'error') {
    throw new Error(data.message || 'exec_sql retornó error');
  }
  return data;
}

async function query(sql) {
  const res = await execSqlJson(sql);
  // La versión JSON de exec_sql retorna {status, message}. Para SELECTs, usamos una envoltura que retorna filas.
  // Implementamos una envoltura con RETURN QUERY via CTE para forzar un resultado JSON.
  // Truco: usar row_to_json en una subconsulta y agregarlas
  const wrapped = `SELECT COALESCE(json_agg(t), '[]'::json) as rows FROM (${sql}) t`;
  const data = await execSqlJson(wrapped);
  if (data && data.rows) return data.rows; // cuando se devuelve directamente
  return null;
}

async function main() {
  console.log('🔎 Verificando RPC create_sale_with_items y políticas RLS');
  console.log('='.repeat(70));

  // Comprobar disponibilidad de exec_sql
  try {
    await execSqlJson('SELECT 1');
    console.log('✅ exec_sql disponible');
  } catch (e) {
    console.error('❌ exec_sql no disponible o no accesible:', e.message);
    console.error('👉 Ejecuta primero: `node scripts/bootstrap-rpc-functions-via-pg.js` (requiere DATABASE_URL)');
    process.exit(1);
  }

  // 1) Verificar enums clave
  console.log('\n🎯 Verificando tipos ENUM (payment_method, discount_type, movement_type)');
  try {
    const rows = await query(`
      SELECT t.typname AS type_name, e.enumlabel AS label
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('payment_method','discount_type','movement_type')
      ORDER BY t.typname, e.enumlabel;
    `);
    if (!rows) throw new Error('Sin respuesta de catálogo');
    const byType = rows.reduce((acc, r) => {
      const k = r.type_name; acc[k] = acc[k] || []; acc[k].push(r.label); return acc;
    }, {});
    const expected = {
      payment_method: ['CASH','CARD','TRANSFER','OTHER'],
      discount_type: ['PERCENTAGE','FIXED_AMOUNT'],
      movement_type: ['IN','OUT','ADJUSTMENT','RETURN','TRANSFER']
    };
    let enumsOk = true;
    Object.entries(expected).forEach(([typ, vals]) => {
      const got = byType[typ] || [];
      const ok = vals.every(v => got.includes(v));
      console.log(`- ${typ}: ${got.length ? '✅' : '❌'} [${got.join(', ')}]`);
      if (!ok) enumsOk = false;
    });
    if (!enumsOk) throw new Error('Enums incompletos o faltantes');
  } catch (e) {
    console.error('❌ Error verificando ENUMs:', e.message);
    process.exit(1);
  }

  // 2) Verificar función y firma
  console.log('\n⚙️  Verificando función public.create_sale_with_items');
  try {
    const fnRows = await query(`
      SELECT p.proname, n.nspname AS schema,
             pg_get_function_arguments(p.oid) AS args,
             pg_get_function_result(p.oid) AS result,
             p.prosecdef AS security_definer
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname='public' AND p.proname='create_sale_with_items';
    `);
    if (!fnRows || fnRows.length === 0) throw new Error('Función no encontrada');
    const fn = fnRows[0];
    const args = (fn.args || '').toLowerCase();
    const expectedArgs = ['text', 'numeric', 'payment_method', 'jsonb'];
    const hasAll = expectedArgs.every(a => args.includes(a));
    const isInvoker = fn.security_definer === false || fn.security_definer === 'f';
    console.log(`- args: ${fn.args}`);
    console.log(`- result: ${fn.result}`);
    console.log(`- security: ${isInvoker ? 'SECURITY INVOKER' : 'SECURITY DEFINER'}`);
    if (!hasAll) throw new Error('Firma de argumentos no coincide');
    if (!isInvoker) throw new Error('La función debe ser SECURITY INVOKER');
  } catch (e) {
    console.error('❌ Error verificando función:', e.message);
    process.exit(1);
  }

  // 3) Verificar GRANT EXECUTE
  console.log('\n🔐 Verificando permisos EXECUTE para authenticated y service_role');
  try {
    const grants = await query(`
      SELECT grantee, privilege_type
      FROM information_schema.routine_privileges
      WHERE specific_schema='public' AND routine_name='create_sale_with_items';
    `);
    const hasAuth = grants.some(g => g.grantee === 'authenticated' && g.privilege_type === 'EXECUTE');
    const hasService = grants.some(g => g.grantee === 'service_role' && g.privilege_type === 'EXECUTE');
    console.log(`- authenticated EXECUTE: ${hasAuth ? '✅' : '❌'}`);
    console.log(`- service_role EXECUTE: ${hasService ? '✅' : '❌'}`);
    if (!hasAuth || !hasService) throw new Error('Faltan GRANT EXECUTE en la función');
  } catch (e) {
    console.error('❌ Error verificando grants:', e.message);
    process.exit(1);
  }

  // 4) Verificar estado RLS y políticas
  console.log('\n🛡️  Verificando RLS y políticas en tablas clave');
  try {
    const rls = await query(`
      SELECT c.relname AS table, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname='public' AND c.relname IN ('sales','sale_items','products','inventory_movements');
    `);
    rls.forEach(r => {
      console.log(`- ${r.table}: RLS ${r.rls_enabled ? '✅' : '❌'} (forced: ${r.rls_forced ? 'yes' : 'no'})`);
    });

    const policies = await query(`
      SELECT tablename, polname, cmd, roles
      FROM pg_policies
      WHERE schemaname='public' AND tablename IN ('sales','sale_items','products','inventory_movements')
      ORDER BY tablename, polname;
    `);
    const byTable = policies.reduce((acc, p) => {
      acc[p.tablename] = acc[p.tablename] || []; acc[p.tablename].push(p); return acc;
    }, {});
    ['sales','sale_items','products','inventory_movements'].forEach(t => {
      const ps = byTable[t] || [];
      console.log(`- ${t}: ${ps.length} políticas`);
    });
  } catch (e) {
    console.error('❌ Error verificando RLS/políticas:', e.message);
    process.exit(1);
  }

  console.log('\n🎉 Verificación completada correctamente');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error fatal:', err.message || err);
  process.exit(1);
});