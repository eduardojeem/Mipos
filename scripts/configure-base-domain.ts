import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function configureBaseDomain() {
  const baseDomain = 'miposparaguay.vercel.app';
  
  console.log('🚀 Configurando dominio base del sistema...\n');
  console.log(`📍 Dominio: ${baseDomain}\n`);

  try {
    // Verificar si la tabla existe
    const { data: tableCheck, error: tableError } = await supabase
      .from('system_settings')
      .select('key')
      .limit(1);

    if (tableError) {
      console.error('❌ La tabla system_settings no existe.');
      console.error('   La tabla debería existir. Verifica tu base de datos.');
      process.exit(1);
    }

    console.log('✅ Tabla system_settings encontrada');

    // Insertar o actualizar configuración (usando la estructura existente)
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'base_domain',
        value: { domain: baseDomain },
        category: 'general',
        description: 'Dominio base del sistema SaaS para subdominios de organizaciones',
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key'
      })
      .select();

    if (error) {
      console.error('❌ Error configurando dominio:', error);
      process.exit(1);
    }

    console.log('✅ Dominio base configurado exitosamente!');
    console.log('\n📋 Configuración guardada:');
    console.log(`   Dominio: ${baseDomain}`);
    console.log(`   Categoría: general`);
    
    // Verificar configuración
    const { data: verification, error: verifyError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'base_domain')
      .single();

    if (verifyError) {
      console.error('⚠️  No se pudo verificar la configuración:', verifyError);
    } else {
      console.log('\n✅ Verificación exitosa:');
      console.log(JSON.stringify(verification, null, 2));
    }

    console.log('\n📝 Próximos pasos:');
    console.log('1. Agregar a .env.local: NEXT_PUBLIC_BASE_DOMAIN=miposparaguay.vercel.app');
    console.log('2. Reiniciar el servidor de desarrollo');
    console.log('3. Ir a /superadmin → Tab "Configuración" para verificar');
    console.log('4. Configurar subdominios en /admin/business-config');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

configureBaseDomain();
