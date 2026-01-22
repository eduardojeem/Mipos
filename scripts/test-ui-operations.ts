import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUIOperations() {
  console.log('🔄 Probando operaciones de la interfaz con Supabase...\n');

  try {
    // 1. Obtener categorías (necesarias para crear productos)
    console.log('1. Obteniendo categorías...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(1);

    if (categoriesError) {
      console.error('❌ Error obteniendo categorías:', categoriesError);
      return;
    }

    if (!categories || categories.length === 0) {
      console.error('❌ No se encontraron categorías');
      return;
    }

    const categoryId = categories[0].id;
    console.log(`✅ Categoría obtenida: ${categories[0].name} (${categoryId})`);

    // 2. Probar operación CREATE (como lo haría la UI)
    console.log('\n2. Probando CREATE desde UI...');
    const newProduct = {
      name: `Producto UI Test ${Date.now()}`,
      sku: `UI-TEST-${Date.now()}`,
      description: 'Producto creado desde prueba de UI',
      cost_price: 10,
      sale_price: 15,
      stock_quantity: 100,
      min_stock: 10,
      category_id: categoryId,
      images: ['https://example.com/image1.jpg']
    };

    const { data: createdProduct, error: createError } = await supabase
      .from('products')
      .insert([newProduct])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creando producto:', createError);
      return;
    }

    console.log(`✅ Producto creado: ${createdProduct.name} (ID: ${createdProduct.id})`);

    // 3. Probar operación READ (como lo haría la UI)
    console.log('\n3. Probando READ desde UI...');
    const { data: readProduct, error: readError } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('id', createdProduct.id)
      .single();

    if (readError) {
      console.error('❌ Error leyendo producto:', readError);
      return;
    }

    console.log(`✅ Producto leído: ${readProduct.name}`);
    console.log(`   Categoría: ${readProduct.categories?.name}`);
    console.log(`   Precio: $${readProduct.sale_price}`);
    console.log(`   Stock: ${readProduct.stock_quantity}`);

    // 4. Probar operación UPDATE (como lo haría la UI)
    console.log('\n4. Probando UPDATE desde UI...');
    const updates = {
      name: `${createdProduct.name} - ACTUALIZADO`,
      sale_price: 20,
      stock_quantity: 150
    };

    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', createdProduct.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error actualizando producto:', updateError);
      return;
    }

    console.log(`✅ Producto actualizado: ${updatedProduct.name}`);
    console.log(`   Nuevo precio: $${updatedProduct.sale_price}`);
    console.log(`   Nuevo stock: ${updatedProduct.stock_quantity}`);

    // 5. Probar filtros y búsqueda (como lo haría la UI)
    console.log('\n5. Probando filtros y búsqueda...');
    const { data: searchResults, error: searchError } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .ilike('name', '%UI Test%')
      .limit(5);

    if (searchError) {
      console.error('❌ Error en búsqueda:', searchError);
      return;
    }

    console.log(`✅ Búsqueda completada: ${searchResults.length} productos encontrados`);

    // 6. Probar paginación (como lo haría la UI)
    console.log('\n6. Probando paginación...');
    const { data: paginatedResults, error: paginationError, count } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `, { count: 'exact' })
      .range(0, 4); // Primeros 5 productos

    if (paginationError) {
      console.error('❌ Error en paginación:', paginationError);
      return;
    }

    console.log(`✅ Paginación completada: ${paginatedResults.length} productos (Total: ${count})`);

    // 7. Probar operación DELETE (como lo haría la UI)
    console.log('\n7. Probando DELETE desde UI...');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', createdProduct.id);

    if (deleteError) {
      console.error('❌ Error eliminando producto:', deleteError);
      return;
    }

    console.log('✅ Producto eliminado exitosamente');

    // 8. Verificar que el producto fue eliminado
    console.log('\n8. Verificando eliminación...');
    const { data: deletedCheck, error: checkError } = await supabase
      .from('products')
      .select('*')
      .eq('id', createdProduct.id);

    if (checkError) {
      console.error('❌ Error verificando eliminación:', checkError);
      return;
    }

    if (deletedCheck.length === 0) {
      console.log('✅ Confirmado: Producto eliminado correctamente');
    } else {
      console.log('⚠️ Advertencia: El producto aún existe después de la eliminación');
    }

    console.log('\n🎉 Todas las pruebas de operaciones UI completadas exitosamente!');
    console.log('\n📊 Resumen:');
    console.log('  ✅ Obtener categorías');
    console.log('  ✅ Crear producto');
    console.log('  ✅ Leer producto con relaciones');
    console.log('  ✅ Actualizar producto');
    console.log('  ✅ Búsqueda y filtros');
    console.log('  ✅ Paginación');
    console.log('  ✅ Eliminar producto');
    console.log('  ✅ Verificar eliminación');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testUIOperations();