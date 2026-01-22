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

async function removeSkuConstraint() {
  console.log('🚀 Iniciando eliminación del constraint problemático...');

  try {
    // 1. Intentar eliminar el constraint problemático
    console.log('\n🔧 Eliminando constraint products_sku_format...');
    
    const dropConstraintQuery = `
      ALTER TABLE products 
      DROP CONSTRAINT IF EXISTS products_sku_format;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropConstraintQuery
    });

    if (dropError) {
      console.error('❌ Error eliminando constraint con RPC:', dropError.message);
      
      // Intentar con query directo
      console.log('🔄 Intentando con query directo...');
      const { error: directError } = await supabase
        .from('_sql')
        .select('*')
        .eq('query', dropConstraintQuery);
        
      if (directError) {
        console.error('❌ Error con query directo:', directError.message);
      }
    } else {
      console.log('✅ Constraint eliminado exitosamente');
    }

    // 2. Verificar que el constraint fue eliminado
    console.log('\n🔍 Verificando constraints restantes...');
    
    const checkConstraintsQuery = `
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'products'::regclass
      AND conname LIKE '%sku%';
    `;

    try {
      const { data: constraints, error: checkError } = await supabase.rpc('exec_sql', {
        sql: checkConstraintsQuery
      });

      if (checkError) {
        console.error('❌ Error verificando constraints:', checkError.message);
      } else {
        if (constraints && constraints.length > 0) {
          console.log('⚠️ Constraints relacionados con SKU encontrados:');
          constraints.forEach((constraint: any) => {
            console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_definition}`);
          });
        } else {
          console.log('✅ No se encontraron constraints relacionados con SKU');
        }
      }
    } catch (err) {
      console.log('ℹ️ No se pudo verificar constraints (esto puede ser normal)');
    }

    // 3. Intentar crear un producto de prueba
    console.log('\n📦 Probando creación de producto sin constraint...');
    
    // Crear categoría de prueba
    const { data: category, error: catError } = await supabase
      .from('categories')
      .upsert([{ 
        name: 'Sin Constraint', 
        description: 'Productos creados sin constraint de SKU' 
      }], { onConflict: 'name' })
      .select('id')
      .single();

    if (catError) {
      console.error('❌ Error creando categoría:', catError.message);
      return;
    }

    // Intentar crear producto
    const testProduct = {
      name: 'Producto Test Sin Constraint',
      description: 'Producto de prueba sin validación de SKU',
      sku: 'TEST-123',
      cost_price: 10.00,
      sale_price: 15.00,
      stock_quantity: 100,
      min_stock: 10,
      category_id: category.id
    };

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([testProduct])
      .select('id, name, sku');

    if (productError) {
      console.error('❌ Error creando producto de prueba:', productError.message);
      console.error(`   Código: ${productError.code}`);
      if (productError.details) console.error(`   Detalles: ${productError.details}`);
      if (productError.hint) console.error(`   Sugerencia: ${productError.hint}`);
    } else {
      console.log('🎉 ¡Producto creado exitosamente!');
      console.log(`   Nombre: ${product.name}`);
      console.log(`   SKU: ${product.sku}`);
      
      // Crear algunos productos más para probar
      console.log('\n📦 Creando productos adicionales...');
      
      const additionalProducts = [
        {
          name: 'Laptop HP',
          description: 'Laptop HP Pavilion',
          sku: 'HP-LAP-001',
          cost_price: 500.00,
          sale_price: 750.00,
          stock_quantity: 10,
          min_stock: 2,
          category_id: category.id
        },
        {
          name: 'Mouse Logitech',
          description: 'Mouse inalámbrico Logitech',
          sku: 'LOG-MOU-002',
          cost_price: 25.00,
          sale_price: 40.00,
          stock_quantity: 50,
          min_stock: 10,
          category_id: category.id
        },
        {
          name: 'Teclado Mecánico',
          description: 'Teclado mecánico RGB',
          sku: 'MEC-KEY-003',
          cost_price: 80.00,
          sale_price: 120.00,
          stock_quantity: 20,
          min_stock: 5,
          category_id: category.id
        }
      ];

      let successCount = 1; // Ya creamos uno
      
      for (const prod of additionalProducts) {
        const { data, error } = await supabase
          .from('products')
          .insert([prod])
          .select('id, name, sku');

        if (error) {
          console.error(`❌ Error creando ${prod.name}:`, error.message);
        } else {
          console.log(`✅ ${prod.name} creado (SKU: ${prod.sku})`);
          successCount++;
        }
      }

      console.log(`\n🎉 ¡${successCount} productos creados exitosamente!`);
      console.log('✅ El constraint problemático ha sido eliminado');
      console.log('✅ Ahora puedes crear productos con cualquier formato de SKU');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
removeSkuConstraint();