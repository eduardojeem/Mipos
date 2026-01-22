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

async function createProductsWithoutSku() {
  console.log('🚀 Iniciando creación de productos sin SKU...');

  try {
    // 1. Crear o obtener categoría
    console.log('\n📁 Creando categoría...');
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Sin SKU')
      .single();

    let categoryId: string;

    if (existingCategory) {
      categoryId = existingCategory.id;
      console.log('✅ Categoría existente encontrada');
    } else {
      const { data: newCategory, error: catError } = await supabase
        .from('categories')
        .insert([{ 
          name: 'Sin SKU', 
          description: 'Productos creados sin SKU inicial' 
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

    // 2. Verificar si la tabla permite SKU nulo
    console.log('\n🔍 Verificando estructura de la tabla...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, is_nullable, column_default')
      .eq('table_name', 'products')
      .eq('table_schema', 'public');

    if (tableError) {
      console.error('❌ Error consultando estructura:', tableError.message);
    } else {
      console.log('📋 Columnas de la tabla products:');
      tableInfo?.forEach(col => {
        console.log(`   - ${col.column_name}: nullable=${col.is_nullable}, default=${col.column_default}`);
      });
    }

    // 3. Intentar crear productos sin SKU (si es posible)
    console.log('\n📦 Intentando crear productos sin SKU...');
    
    const products = [
      {
        name: 'Producto Sin SKU 1',
        description: 'Primer producto sin SKU',
        cost_price: 5.00,
        sale_price: 10.00,
        stock_quantity: 50,
        min_stock: 5,
        category_id: categoryId
        // Omitimos el campo sku
      },
      {
        name: 'Producto Sin SKU 2',
        description: 'Segundo producto sin SKU',
        cost_price: 8.00,
        sale_price: 15.00,
        stock_quantity: 30,
        min_stock: 3,
        category_id: categoryId
        // Omitimos el campo sku
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([product])
          .select('id, name, sku');

        if (error) {
          console.error(`❌ Error creando ${product.name}:`, error.message);
          console.error('   Código:', error.code);
          console.error('   Detalles:', error.details);
          errorCount++;
        } else {
          console.log(`✅ ${product.name} creado exitosamente`);
          console.log(`   ID: ${data[0].id}, SKU: ${data[0].sku || 'NULL'}`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Excepción creando ${product.name}:`, err);
        errorCount++;
      }
    }

    // 4. Si los productos se crearon, intentar actualizar con SKUs simples
    if (successCount > 0) {
      console.log('\n🔄 Intentando actualizar con SKUs...');
      
      const { data: createdProducts } = await supabase
        .from('products')
        .select('id, name')
        .eq('category_id', categoryId)
        .is('sku', null);

      if (createdProducts && createdProducts.length > 0) {
        for (let i = 0; i < createdProducts.length; i++) {
          const product = createdProducts[i];
          const newSku = `NOSKU${String(i + 1).padStart(3, '0')}`;
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ sku: newSku })
            .eq('id', product.id);

          if (updateError) {
            console.error(`❌ Error actualizando SKU para ${product.name}:`, updateError.message);
          } else {
            console.log(`✅ SKU actualizado para ${product.name}: ${newSku}`);
          }
        }
      }
    }

    // 5. Verificar productos finales
    console.log('\n🔍 Verificando productos finales...');
    
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
          console.log(`   - ${product.name} (SKU: ${product.sku || 'NULL'})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createProductsWithoutSku();