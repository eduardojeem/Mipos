const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://zrbzkmfloiurwhydpvap.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnprbWZsb2l1cndoeWRwdmFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2MzUxOSwiZXhwIjoyMDc0ODM5NTE5fQ.3CTK3Z2Et3ydra7ZWQI9oArzMGErNzUPgyop6d1moRo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestData() {
  try {
    console.log('🚀 Iniciando creación de datos de prueba con Supabase...');

    // 1. Crear categorías primero
    console.log('📂 Creando categorías...');
    
    const categoriesData = [
      { name: 'Cosméticos', description: 'Productos de belleza y cuidado personal' },
      { name: 'Maquillaje', description: 'Productos de maquillaje facial y corporal' },
      { name: 'Cuidado de la Piel', description: 'Productos para el cuidado y tratamiento de la piel' },
      { name: 'Fragancias', description: 'Perfumes y colonias' }
    ];

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .upsert(categoriesData, { onConflict: 'name' })
      .select();

    if (categoriesError) {
      console.error('❌ Error creando categorías:', categoriesError);
      return;
    }

    console.log(`✅ Creadas ${categories.length} categorías`);

    // 2. Crear productos
    console.log('🛍️ Creando productos...');
    
    const productsData = [
      {
        name: 'Base de Maquillaje Líquida',
        sku: 'BASE001',
        category_id: categories.find(c => c.name === 'Maquillaje').id,
        description: 'Base de maquillaje líquida de cobertura media - Tono Medium',
        cost_price: 15.00,
        sale_price: 25.99,
        stock_quantity: 50,
        min_stock: 10,
        images: []
      },
      {
        name: 'Labial Mate',
        sku: 'LAB001',
        category_id: categories.find(c => c.name === 'Maquillaje').id,
        description: 'Labial de larga duración con acabado mate - Rojo Clásico',
        cost_price: 8.00,
        sale_price: 16.99,
        stock_quantity: 75,
        min_stock: 15,
        images: []
      },
      {
        name: 'Crema Hidratante Facial',
        sku: 'CREMA001',
        category_id: categories.find(c => c.name === 'Cuidado de la Piel').id,
        description: 'Crema hidratante para rostro con ácido hialurónico - 50ml',
        cost_price: 12.00,
        sale_price: 22.99,
        stock_quantity: 30,
        min_stock: 8,
        images: []
      },
      {
        name: 'Protector Solar SPF 50',
        sku: 'PROT001',
        category_id: categories.find(c => c.name === 'Cuidado de la Piel').id,
        description: 'Protector solar facial con SPF 50 - Resistente al agua - 60ml',
        cost_price: 18.00,
        sale_price: 32.99,
        stock_quantity: 25,
        min_stock: 5,
        images: []
      },
      {
        name: 'Perfume Floral',
        sku: 'PERF001',
        category_id: categories.find(c => c.name === 'Fragancias').id,
        description: 'Perfume con notas florales frescas - 50ml',
        cost_price: 25.00,
        sale_price: 45.99,
        stock_quantity: 20,
        min_stock: 5,
        images: []
      },
      {
        name: 'Máscara de Pestañas',
        sku: 'MASC001',
        category_id: categories.find(c => c.name === 'Maquillaje').id,
        description: 'Máscara de pestañas voluminizadora resistente al agua - 10ml',
        cost_price: 10.00,
        sale_price: 19.99,
        stock_quantity: 40,
        min_stock: 10,
        images: []
      },
      {
        name: 'Serum Vitamina C',
        sku: 'SER001',
        category_id: categories.find(c => c.name === 'Cuidado de la Piel').id,
        description: 'Serum antioxidante con vitamina C y ácido ferúlico - 30ml',
        cost_price: 20.00,
        sale_price: 35.99,
        stock_quantity: 15,
        min_stock: 3,
        images: []
      },
      {
        name: 'Rubor en Polvo',
        sku: 'RUB001',
        category_id: categories.find(c => c.name === 'Maquillaje').id,
        description: 'Rubor en polvo compacto - Rosa Natural - Acabado satinado',
        cost_price: 7.00,
        sale_price: 14.99,
        stock_quantity: 35,
        min_stock: 8,
        images: []
      }
    ];

    const { data: products, error: productsError } = await supabase
      .from('products')
      .upsert(productsData, { onConflict: 'sku' })
      .select();

    if (productsError) {
      console.error('❌ Error creando productos:', productsError);
      return;
    }

    console.log(`✅ Creados ${products.length} productos`);

    // 3. Crear algunos clientes de prueba
    console.log('👥 Creando clientes de prueba...');
    
    const customersData = [
      {
        name: 'María García',
        email: 'maria.garcia@email.com',
        phone: '+1234567890'
      },
      {
        name: 'Ana López',
        email: 'ana.lopez@email.com',
        phone: '+1234567891'
      },
      {
        name: 'Carlos Martínez',
        email: 'carlos.martinez@email.com',
        phone: '+1234567892'
      }
    ];

    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .upsert(customersData, { onConflict: 'email' })
      .select();

    if (customersError) {
      console.error('❌ Error creando clientes:', customersError);
      return;
    }

    console.log(`✅ Creados ${customers.length} clientes`);

    console.log('\n🎉 ¡Datos de prueba creados exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   - Categorías: ${categories.length}`);
    console.log(`   - Productos: ${products.length}`);
    console.log(`   - Clientes: ${customers.length}`);

    // 4. Verificar que los datos se crearon correctamente
    console.log('\n🔍 Verificando datos creados...');
    
    const { data: allProducts, error: verifyError } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          name
        )
      `);

    if (verifyError) {
      console.error('❌ Error verificando productos:', verifyError);
    } else {
      console.log('\n📋 Productos creados:');
      allProducts.forEach(product => {
        console.log(`   - ${product.name} (${product.sku}) - Stock: ${product.stock_quantity} - Categoría: ${product.categories?.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createTestData();