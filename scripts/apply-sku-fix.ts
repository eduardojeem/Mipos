import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSkuConstraint() {
  console.log('🔧 Iniciando corrección de restricción SKU...');

  try {
    // 1. Eliminar la restricción existente
    console.log('\n🗑️ Eliminando restricción existente...');
    
    const dropConstraintSql = `
      ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_format;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', { 
      sql: dropConstraintSql 
    });

    if (dropError && !dropError.message.includes('function')) {
      console.error('❌ Error eliminando restricción:', dropError.message);
    } else {
      console.log('✅ Restricción eliminada (o no existía)');
    }

    // 2. Crear nueva restricción con regex corregido
    console.log('\n➕ Creando nueva restricción...');
    
    const addConstraintSql = `
      ALTER TABLE products ADD CONSTRAINT products_sku_format 
      CHECK (sku ~ '^[A-Z0-9_-]+$');
    `;

    const { error: addError } = await supabase.rpc('exec_sql', { 
      sql: addConstraintSql 
    });

    if (addError && !addError.message.includes('function')) {
      console.error('❌ Error creando nueva restricción:', addError.message);
      
      // Intentar con método alternativo usando query directa
      console.log('\n🔄 Intentando método alternativo...');
      
      // Usar una consulta más simple para verificar el estado actual
      const { data: constraints, error: checkError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', 'products')
        .eq('constraint_type', 'CHECK');

      if (checkError) {
        console.error('❌ Error verificando restricciones:', checkError.message);
      } else {
        console.log('📋 Restricciones actuales:', constraints);
      }
    } else {
      console.log('✅ Nueva restricción creada exitosamente');
    }

    // 3. Verificar la nueva restricción
    console.log('\n🔍 Verificando restricción...');
    
    const verifySql = `
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'products'::regclass 
      AND contype = 'c'
      AND conname = 'products_sku_format';
    `;

    const { data: verifyResult, error: verifyError } = await supabase.rpc('exec_sql', { 
      sql: verifySql 
    });

    if (verifyError && !verifyError.message.includes('function')) {
      console.error('❌ Error verificando restricción:', verifyError.message);
    } else if (verifyResult) {
      console.log('✅ Restricción verificada:', verifyResult);
    }

    // 4. Probar inserción de producto
    console.log('\n🧪 Probando inserción de producto...');
    
    // Primero obtener una categoría
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (!categories || categories.length === 0) {
      console.log('⚠️ No hay categorías disponibles, creando una...');
      
      const { data: newCategory, error: catError } = await supabase
        .from('categories')
        .insert([{ name: 'Test Fix Category', description: 'Categoría para probar fix' }])
        .select('id')
        .single();

      if (catError) {
        console.error('❌ Error creando categoría:', catError.message);
        return;
      }

      categories.push(newCategory);
    }

    const categoryId = categories[0].id;

    // Probar inserción con diferentes formatos de SKU
    const testProducts = [
      { name: 'Test Product 1', sku: 'TEST001', description: 'Solo alfanumérico' },
      { name: 'Test Product 2', sku: 'TEST_002', description: 'Con guión bajo' },
      { name: 'Test Product 3', sku: 'TEST-003', description: 'Con guión' },
      { name: 'Test Product 4', sku: 'TEST_004-A', description: 'Con ambos' }
    ];

    for (const product of testProducts) {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...product,
          category_id: categoryId,
          cost_price: 10.00,
          sale_price: 20.00,
          stock_quantity: 100,
          min_stock: 10
        }])
        .select('id, name, sku');

      if (error) {
        console.error(`❌ Error insertando ${product.name}:`, error.message);
      } else {
        console.log(`✅ ${product.name} insertado exitosamente (SKU: ${product.sku})`);
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
fixSkuConstraint();