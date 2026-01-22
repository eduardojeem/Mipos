// Verifica create_sale_with_items y RLS directamente vía PostgreSQL (pg)
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function connectPg() {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL/DIRECT_DATABASE_URL no configurado');
  }
  let client;
  const connUrl = (() => { try { return new URL(connectionString); } catch (e) { return null; } })();
  try {
    client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    return client;
  } catch (poolErr) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const projectRefMatch = supabaseUrl && supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
    const projectRef = projectRefMatch ? projectRefMatch[1] : null;
    const dbName = connUrl ? (connUrl.pathname.replace(/^\//,'') || 'postgres') : 'postgres';
    const dbUser = 'postgres';
    const dbPass = connUrl ? connUrl.password : undefined;
    if (!projectRef || !dbPass) throw poolErr;
    client = new Client({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: dbName,
      user: dbUser,
      password: dbPass,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    return client;
  }
}

async function main() {
  console.log('🔎 Verificando create_sale_with_items y políticas RLS (pg)');
  console.log('='.repeat(70));
  let client;
  try {
    client = await connectPg();
    console.log('✅ Conexión a PostgreSQL establecida');

    // Enums
    console.log('\n🎯 ENUMS (payment_method, discount_type, movement_type)');
    const enumsRes = await client.query(`
      SELECT t.typname AS type_name, e.enumlabel AS label
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('payment_method','discount_type','movement_type')
      ORDER BY t.typname, e.enumlabel;
    `);
    const byType = enumsRes.rows.reduce((acc, r) => {
      acc[r.type_name] = acc[r.type_name] || []; acc[r.type_name].push(r.label); return acc;
    }, {});
    Object.entries(byType).forEach(([typ, labels]) => {
      console.log(`- ${typ}: ✅ [${labels.join(', ')}]`);
    });

    // Función y firma
    console.log('\n⚙️  Función public.create_sale_with_items');
    const fnRes = await client.query(`
      SELECT p.proname, n.nspname AS schema,
             pg_get_function_arguments(p.oid) AS args,
             pg_get_function_result(p.oid) AS result,
             p.prosecdef AS security_definer
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname='public' AND p.proname='create_sale_with_items';
    `);
    if (fnRes.rowCount === 0) throw new Error('Función no encontrada');
    const fn = fnRes.rows[0];
    console.log(`- args: ${fn.args}`);
    console.log(`- result: ${fn.result}`);
    console.log(`- security: ${fn.security_definer ? 'SECURITY DEFINER' : 'SECURITY INVOKER'}`);
    const argsLc = (fn.args || '').toLowerCase();
    const okArgs = ['text','numeric','payment_method','jsonb'].every(a => argsLc.includes(a));
    if (!okArgs) throw new Error('Firma de argumentos no coincide con lo esperado');
    if (fn.security_definer) throw new Error('La función debe ser SECURITY INVOKER');

    // Grants EXECUTE
    console.log('\n🔐 GRANTS EXECUTE');
    const grantsRes = await client.query(`
      SELECT grantee, privilege_type
      FROM information_schema.routine_privileges
      WHERE specific_schema='public' AND routine_name='create_sale_with_items';
    `);
    const hasAuth = grantsRes.rows.some(r => r.grantee === 'authenticated' && r.privilege_type === 'EXECUTE');
    const hasService = grantsRes.rows.some(r => r.grantee === 'service_role' && r.privilege_type === 'EXECUTE');
    console.log(`- authenticated EXECUTE: ${hasAuth ? '✅' : '❌'}`);
    console.log(`- service_role EXECUTE: ${hasService ? '✅' : '❌'}`);
    if (!hasAuth || !hasService) throw new Error('Faltan GRANT EXECUTE para authenticated/service_role');

    // RLS enabled
    console.log('\n🛡️  RLS por tabla');
    const rlsRes = await client.query(`
      SELECT c.relname AS table, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname='public' AND c.relname IN ('sales','sale_items','products','inventory_movements');
    `);
    rlsRes.rows.forEach(r => {
      console.log(`- ${r.table}: RLS ${r.rls_enabled ? '✅' : '❌'} (forced: ${r.rls_forced ? 'yes' : 'no'})`);
    });

    // Políticas
    console.log('\n📜 Políticas RLS');
    const polRes = await client.query(`
      SELECT tablename, polname, cmd, roles
      FROM pg_policies
      WHERE schemaname='public' AND tablename IN ('sales','sale_items','products','inventory_movements')
      ORDER BY tablename, polname;
    `);
    const byTable = polRes.rows.reduce((acc, p) => { acc[p.tablename] = acc[p.tablename] || []; acc[p.tablename].push(p); return acc; }, {});
    ['sales','sale_items','products','inventory_movements'].forEach(t => {
      const ps = byTable[t] || []; console.log(`- ${t}: ${ps.length} políticas`);
    });

    console.log('\n🎉 Verificación completada correctamente');
  } catch (err) {
    console.error('❌ Error de verificación:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (client) await client.end();
  }
}

main();