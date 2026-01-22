#!/usr/bin/env tsx

/**
 * Script simple para crear productos de prueba en Supabase
 * Versión simplificada sin caracteres especiales
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Cargar variables de entorno
config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSimpleTestProducts() {
  console.log('🚀 Creando productos de prueba simples...\n');

  try {
    // 1. Crear categoría de prueba
    console.log('📁 Creando categoría de prueba...');
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', 'Productos de Prueba')
      .single();

    let categoryId;
    if (existingCategory) {
      console.log('   ✓ Categoría "Productos de Prueba" ya existe');
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory, error: categoryError } = await supabase
        .from('categories')
        .insert([{
          name: 'Productos de Prueba',
          description: 'Categoría para productos de prueba del sistema'
        }])
        .select()
        .single();

      if (categoryError) {
        console.error('❌ Error creando categoría:', categoryError.message);
        return;
      }

      console.log('   ✓ Categoría "Productos de Prueba" creada');
      categoryId = newCategory.id;
    }

    // 2. Crear productos simples
    console.log('\n📦 Creando productos...');
    
    const simpleProducts = [
      {
        name: 'Producto Test 1',
        sku: 'TEST-001',
        description: 'Producto de prueba numero 1',
        cost_price: 10.00,
        sale_price: 20.00,
        stock_quantity: 100,
        min_stock: 10
      },
      {
        name: 'Producto Test 2',
        sku: 'TEST-002',
        description: 'Producto de prueba numero 2',
        cost_price: 15.50,
        sale_price: 30.00,
        stock_quantity: 50,
        min_stock: 5
      },
      {
        name: 'Producto Test 3',
        sku: 'TEST-003',
        description: 'Producto de prueba numero 3',
        cost_price: 25.00,
        sale_price: 45.99,
        stock_quantity: 75,
        min_stock: 15
      },
      {
        name: 'Laptop Gaming',
        sku: 'LAP-001',
        description: 'Laptop para gaming de alta gama',
        cost_price: 800.00,
        sale_price: 1200.00,
        stock_quantity: 5,
        min_stock: 2
      },
      {
        name: 'Mouse Inalambrico',
        sku: 'MOU-001',
        description: 'Mouse inalambrico ergonomico',
        cost_price: 25.00,
        sale_price: 45.00,
        stock_quantity: 30,
        min_stock: 10
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const product of simpleProducts) {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', product.sku)
        .single();

      if (existing) {
        console.log(`   ⚠️  Producto "${product.name}" (${product.sku}) ya existe`);
        skippedCount++;
        continue;
      }

      // Crear producto
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([{
          ...product,
          category_id: categoryId,
          images: []
        }])
        .select()
        .single();

      if (error) {
        console.error(`   ❌ Error creando "${product.name}":`, error.message);
        continue;
      }

      console.log(`   ✓ Producto "${product.name}" creado (Stock: ${product.stock_quantity})`);
      createdCount++;
    }

    // 3. Resumen
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN');
    console.log('='.repeat(50));
    console.log(`✅ Productos creados: ${createdCount}`);
    console.log(`⚠️  Productos omitidos: ${skippedCount}`);
    console.log(`📦 Total procesados: ${createdCount + skippedCount}`);

    console.log('\n🎉 ¡Proceso completado!');
    console.log('💡 Verifica en: http://localhost:3000/dashboard/products');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
if (require.main === module) {
  createSimpleTestProducts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { createSimpleTestProducts };