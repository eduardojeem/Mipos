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

async function createSimpleProducts() {
  console.log('🚀 Iniciando creación de productos con SKUs numéricos...');

  try {
    // 1. Crear o obtener categoría
    console.log('\n📁 Creando categoría...');
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Productos Numericos')
      .single();

    let categoryId: string;

    if (existingCategory) {
      categoryId = existingCategory.id;
      console.log('✅ Categoría existente encontrada');
    } else {
      const { data: newCategory, error: catError } = await supabase
        .from('categories')
        .insert([{ 
          name: 'Productos Numericos', 
          description: 'Productos con SKUs solo numéricos' 
        }])
        .select('id')
        .single();

      if (catError) {
        console.error('❌ Error creando categoría:', catError.message);
        return;
      }

      categoryId = newCategory!.id;
      console.log('✅ Categoría creada exitosamente');
    }

    // 2. Crear productos con SKUs solo numéricos
    console.log('\n📦 Creando productos...');
    
    const products = [
      {
        name: 'Producto Uno',
        sku: '001',
        description: 'Primer producto de prueba',
        cost_price: 5.00,
        sale_price: 10.00,
        stock_quantity: 50,
        min_stock: 5,
        category_id: categoryId
      },
      {
        name: 'Producto Dos',
        sku: '002',
        description: 'Segundo producto de prueba',
        cost_price: 8.00,
        sale_price: 15.00,
        stock_quantity: 30,
        min_stock: 3,
        category_id: categoryId
      },
      {
        name: 'Producto Tres',
        sku: '003',
        description: 'Tercer producto de prueba',
        cost_price: 12.00,
        sale_price: 20.00,
        stock_quantity: 25,
        min_stock: 2,
        category_id: categoryId
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const { data, error } = await supabase
          .from('products')
          .upsert([product], { onConflict: 'sku' })
          .select('id, name, sku');

        if (error) {
          console.error(`❌ Error creando ${product.name}:`, error.message);
          console.error('   Código:', error.code);
          errorCount++;
        } else {
          console.log(`✅ ${product.name} creado exitosamente (SKU: ${product.sku})`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Excepción creando ${product.name}:`, err);
        errorCount++;
      }
    }

    // 3. Verificar productos creados
    console.log('\n🔍 Verificando productos creados...');
    
    const { data: allProducts, error: queryError } = await supabase
      .from('products')
      .select('id, name, sku, category_id')
      .eq('category_id', categoryId);

    if (queryError) {
      console.error('❌ Error consultando productos:', queryError.message);
    } else {
      console.log(`\n📊 Resumen:`);
      console.log(`   ✅ Productos creados exitosamente: ${successCount}`);
      console.log(`   ❌ Errores: ${errorCount}`);
      console.log(`   📦 Total en base de datos: ${allProducts?.length || 0}`);
      
      if (allProducts && allProducts.length > 0) {
        console.log('\n📋 Productos en la base de datos:');
        allProducts.forEach(product => {
          console.log(`   - ${product.name} (SKU: ${product.sku})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createSimpleProducts();