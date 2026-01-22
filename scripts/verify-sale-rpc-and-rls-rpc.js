// Verificación usando RPC auxiliares: existencia función, RLS y grants
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const args = process.argv.slice(2);
const outputJson = args.includes('--json');

async function hasExec(role, signatures) {
  for (const sig of signatures) {
    const { data, error } = await supabase.rpc('check_function_has_privilege', {
      function_signature: sig,
      role_name: role,
    });
    if (!error && data === true) return true;
  }
  return false;
}

async function main() {
  console.log('🔎 Verificando función y RLS vía RPC auxiliares');
  console.log('='.repeat(70));

  const results = {
    function_exists: false,
    auth_execute: false,
    service_execute: false,
    rls: {}
  };

  // 1) Función create_sale_with_items existe
  try {
    const { data, error } = await supabase.rpc('check_function_exists', { function_name: 'create_sale_with_items' });
    if (error) throw error;
    results.function_exists = !!data;
    console.log(`⚙️  create_sale_with_items: ${results.function_exists ? '✅ existe' : '❌ no existe'}`);
    if (!results.function_exists) process.exit(1);
  } catch (e) {
    console.error('❌ Error verificando existencia de función:', e.message || e);
    process.exit(1);
  }

  // 2) Grants EXECUTE (usando has_function_privilege por firma)
  try {
    const signatures = [
      // Overload 1: (bigint, numeric, numeric, payment_method, jsonb)
      'public.create_sale_with_items(bigint, numeric, numeric, payment_method, jsonb)',
      'public.create_sale_with_items(bigint, numeric, numeric, public.payment_method, jsonb)',
      // Overload 2: (bigint, uuid, numeric, numeric, numeric, payment_method, text, text, text, jsonb)
      'public.create_sale_with_items(bigint, uuid, numeric, numeric, numeric, payment_method, text, text, text, jsonb)',
      'public.create_sale_with_items(bigint, uuid, numeric, numeric, numeric, public.payment_method, text, text, text, jsonb)'
    ];

    results.auth_execute = await hasExec('authenticated', signatures);
    results.service_execute = await hasExec('service_role', signatures);
    console.log(`🔐 authenticated EXECUTE: ${results.auth_execute ? '✅' : '❌'}`);
    console.log(`🔐 service_role EXECUTE: ${results.service_execute ? '✅' : '❌'}`);
    if (!results.auth_execute || !results.service_execute) process.exit(1);
  } catch (e) {
    console.error('❌ Error verificando grants:', e.message || e);
    process.exit(1);
  }

  // 3) RLS status y políticas (no bloqueante)
  try {
    const { data: rlsStatus, error } = await supabase.rpc('check_rls_status', { table_name: null });
    if (error) throw error;
    const target = ['sales','sale_items','products','inventory_movements'];
    target.forEach(t => {
      const row = (rlsStatus || []).find(r => r.table_name === t || r.table === t);
      if (row) {
        const enabled = row.rls_enabled === true || row.rls_enabled === 't';
        const policies = Number(row.policy_count) || 0;
        results.rls[t] = { enabled, policies };
        console.log(`🛡️  ${t}: RLS ${enabled ? '✅' : '❌'} (políticas: ${policies})`);
      } else {
        results.rls[t] = { enabled: null, policies: null };
        console.log(`🛡️  ${t}: ⚠️ sin reporte`);
      }
    });
  } catch (e) {
    console.error('⚠️  Error verificando RLS (no bloqueante):', e.message || e);
  }

  // 4) Resumen para CI
  const summaryLines = [
    `Función: ${results.function_exists ? 'OK' : 'FAIL'}`,
    `Grant authenticated: ${results.auth_execute ? 'OK' : 'FAIL'}`,
    `Grant service_role: ${results.service_execute ? 'OK' : 'FAIL'}`,
    `RLS sales: ${fmtRls(results.rls['sales'])}`,
    `RLS sale_items: ${fmtRls(results.rls['sale_items'])}`,
    `RLS products: ${fmtRls(results.rls['products'])}`,
    `RLS inventory_movements: ${fmtRls(results.rls['inventory_movements'])}`,
  ];

  function fmtRls(info) {
    if (!info) return 'n/d';
    if (info.enabled === null) return 'n/d';
    return `${info.enabled ? 'ON' : 'OFF'} (${info.policies ?? 0} policies)`;
  }

  console.log('\n📋 RESUMEN CI');
  console.log('----------------------------------------');
  summaryLines.forEach(l => console.log(`• ${l}`));

  if (outputJson) {
    const payload = {
      function_exists: results.function_exists,
      auth_execute: results.auth_execute,
      service_execute: results.service_execute,
      rls: results.rls,
      ok: results.function_exists && results.auth_execute && results.service_execute
    };
    console.log('\nJSON:');
    console.log(JSON.stringify(payload));
  }

  console.log('\n🎉 Verificación RPC completada');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error fatal:', err.message || err);
  process.exit(1);
});