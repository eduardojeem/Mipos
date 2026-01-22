#!/usr/bin/env tsx
/**
 * Script para Aplicar Mejoras RLS en Supabase
 * 
 * Este script ejecuta el SQL de mejoras RLS directamente en Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQLFile(filePath: string) {
  console.log(`\n📄 Leyendo archivo: ${filePath}\n`);
  
  const sqlContent = fs.readFileSync(filePath, 'utf-8');
  
  // Dividir el SQL en bloques ejecutables (separados por comentarios de sección)
  const sqlBlocks = sqlContent
    .split(/-- ={60,}/)
    .filter(block => block.trim().length > 0)
    .map(block => block.trim());

  console.log(`📦 Encontrados ${sqlBlocks.length} bloques SQL para ejecutar\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < sqlBlocks.length; i++) {
    const block = sqlBlocks[i];
    
    // Extraer el título del bloque (primera línea de comentario)
    const titleMatch = block.match(/^--\s*(.+?)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Bloque ${i + 1}`;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Ejecutando: ${title}`);
    console.log(`${'='.repeat(60)}\n`);

    // Dividir el bloque en statements individuales
    const statements = block
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      // Saltar comentarios y líneas vacías
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      try {
        // Ejecutar el statement
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          // Algunos errores son esperados (ej: DROP POLICY IF EXISTS cuando no existe)
          if (error.message.includes('does not exist') || 
              error.message.includes('already exists')) {
            console.log(`⚠️  ${error.message.substring(0, 80)}...`);
          } else {
            console.error(`❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`✅ Ejecutado correctamente`);
          successCount++;
        }
      } catch (err: any) {
        console.error(`❌ Error inesperado: ${err.message}`);
        errorCount++;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n📊 RESUMEN DE EJECUCIÓN\n`);
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`📈 Total: ${successCount + errorCount}\n`);

  return { successCount, errorCount };
}

async function verifyChanges() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n🔍 VERIFICANDO CAMBIOS APLICADOS\n`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Verificar acceso público
  console.log('1️⃣ Verificando acceso público a promociones...');
  const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: publicPromos, error: publicError } = await anonClient
    .from('promotions')
    .select('*');

  if (publicError) {
    console.log(`   ❌ Error: ${publicError.message}`);
  } else {
    console.log(`   ✅ Acceso público: ${publicPromos?.length || 0} promociones visibles`);
  }

  // 2. Verificar tabla de auditoría
  console.log('\n2️⃣ Verificando tabla de auditoría...');
  const { error: auditError } = await supabase
    .from('promotion_audit_logs')
    .select('*')
    .limit(1);

  if (auditError && auditError.code === '42P01') {
    console.log(`   ❌ Tabla promotion_audit_logs no existe`);
  } else {
    console.log(`   ✅ Tabla promotion_audit_logs existe`);
  }

  // 3. Verificar vista
  console.log('\n3️⃣ Verificando vista optimizada...');
  const { error: viewError } = await supabase
    .from('active_promotions_with_products')
    .select('*')
    .limit(1);

  if (viewError && viewError.code === '42P01') {
    console.log(`   ❌ Vista active_promotions_with_products no existe`);
  } else {
    console.log(`   ✅ Vista active_promotions_with_products existe`);
  }

  // 4. Verificar protección de escritura
  console.log('\n4️⃣ Verificando protección de escritura...');
  const { error: writeError } = await anonClient
    .from('promotions')
    .insert({
      name: 'Test',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      is_active: true
    });

  if (writeError) {
    console.log(`   ✅ Protección activa: Usuario anónimo no puede insertar`);
  } else {
    console.log(`   ❌ Protección fallida: Usuario anónimo puede insertar`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

async function main() {
  console.log('🚀 Aplicando Mejoras RLS en Supabase\n');
  console.log(`📍 URL: ${SUPABASE_URL}`);
  console.log(`🔑 Usando SERVICE_ROLE_KEY\n`);

  const sqlFilePath = path.resolve(process.cwd(), 'scripts/sql/fix-promotions-rls.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ Error: No se encontró el archivo ${sqlFilePath}`);
    process.exit(1);
  }

  try {
    // Ejecutar el SQL
    const result = await executeSQLFile(sqlFilePath);

    // Verificar cambios
    await verifyChanges();

    if (result.errorCount === 0) {
      console.log('🎉 ¡Mejoras RLS aplicadas exitosamente!\n');
      console.log('📋 Próximos pasos:');
      console.log('   1. Ejecuta: npx tsx scripts/test-rls-improvements.ts');
      console.log('   2. Verifica en: http://localhost:3000/dashboard/promotions');
      console.log('   3. Revisa políticas en Supabase SQL Editor\n');
    } else {
      console.log('⚠️  Algunas operaciones fallaron. Revisa los errores arriba.\n');
    }

  } catch (error: any) {
    console.error(`\n❌ Error fatal: ${error.message}\n`);
    process.exit(1);
  }
}

main();
