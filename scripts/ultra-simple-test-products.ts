import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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

async function createTestData() {
  console.log('🚀 Iniciando creación de datos de prueba...');

  try {
    // 1. Crear categoría de prueba
    console.log('\n📁 Creando categoría...');
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', 'Test Category')
      .single();

    let categoryId: string;

    if (existingCategory) {
      console.log('✅ Categoría "Test Category" ya existe');
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert([{ name: 'Test Category', description: 'Categoria de prueba' }])
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creando categoría:', error.message);
        return;
      }

      categoryId = newCategory!.id;
      console.log('✅ Categoría "Test Category" creada exitosamente');
    }

    // 2. Crear productos con SKUs simples (sin guiones)
    console.log('\n📦 Creando productos...');
    
    const testProducts = [
      {
        name: 'Test Product A',
        sku: 'TESTA001',  // Sin guiones
        category_id: categoryId,
        description: 'Producto de prueba A',
        cost_price: 10.00,
        sale_price: 20.00,
        stock_quantity: 100,
        min_stock: 10
      },
      {
        name: 'Test Product B',
        sku: 'TESTB002',  // Sin guiones
        category_id: categoryId,
        description: 'Producto de prueba B',
        cost_price: 15.00,
        sale_price: 30.00,
        stock_quantity: 50,
        min_stock: 5
      },
      {
        name: 'Test Product C',
        sku: 'TESTC003',  // Sin guiones
        category_id: categoryId,
        description: 'Producto de prueba C',
        cost_price: 25.00,
        sale_price: 50.00,
        stock_quantity: 25,
        min_stock: 3
      }
    ];

    let productsCreated = 0;

    for (const product of testProducts) {
      // Verificar si el producto ya existe
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('sku', product.sku)
        .single();

      if (existingProduct) {
        console.log(`✅ Producto "${product.name}" (SKU: ${product.sku}) ya existe`);
        continue;
      }

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([product])
        .select('id, name, sku')
        .single();

      if (error) {
        console.error(`❌ Error creando producto "${product.name}":`, error.message);
        console.error('Detalles del error:', error);
      } else if (newProduct) {
        console.log(`✅ Producto "${product.name}" (SKU: ${product.sku}) creado exitosamente`);
        productsCreated++;
      }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   📁 Categorías: 1`);
    console.log(`   📦 Productos creados: ${productsCreated}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createTestData();