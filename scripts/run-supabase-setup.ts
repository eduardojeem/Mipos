import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSupabaseSetup() {
  console.log('🚀 INICIANDO CONFIGURACIÓN DE SUPABASE');
  console.log('=====================================');
  
  try {
    // Leer el archivo SQL de configuración
    const sqlPath = join(process.cwd(), 'scripts', 'supabase-roles-setup.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 Archivo SQL cargado:', sqlPath);
    
    // Dividir el contenido en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Ejecutando ${commands.length} comandos SQL...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.length < 10) continue; // Saltar comandos muy cortos
      
      try {
        console.log(`⏳ Ejecutando comando ${i + 1}/${commands.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: command + ';' 
        });
        
        if (error) {
          console.log(`⚠️  Comando ${i + 1} falló:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error en comando ${i + 1}:`, err);
        errorCount++;
      }
    }
    
    console.log('\n📊 RESUMEN DE EJECUCIÓN:');
    console.log(`✅ Comandos exitosos: ${successCount}`);
    console.log(`❌ Comandos fallidos: ${errorCount}`);
    
    // Verificar que las tablas se crearon
    console.log('\n🔍 Verificando tablas creadas...');
    
    const tables = ['roles', 'permissions', 'user_roles', 'role_permissions'];
    let tablesCreated = 0;
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`✅ Tabla '${table}' existe`);
          tablesCreated++;
        } else {
          console.log(`❌ Tabla '${table}' no existe:`, error.message);
        }
      } catch (err) {
        console.log(`❌ Error verificando tabla '${table}':`, err);
      }
    }
    
    console.log(`\n📋 Tablas creadas: ${tablesCreated}/${tables.length}`);
    
    if (tablesCreated === tables.length) {
      console.log('🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!');
      console.log('✅ Todas las tablas del sistema de roles están listas');
    } else {
      console.log('⚠️  CONFIGURACIÓN PARCIAL');
      console.log('❗ Algunas tablas no se pudieron crear');
    }
    
  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
    process.exit(1);
  }
}

runSupabaseSetup().catch(console.error);