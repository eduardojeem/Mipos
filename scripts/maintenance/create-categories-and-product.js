const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001/api';

async function createCategoriesAndProduct() {
  console.log('🚀 Creando categorías y producto de prueba...\n');

  try {
    // 1. Verificar categorías existentes
    console.log('📋 Verificando categorías existentes...');
    const categoriesResponse = await axios.get(`${BASE_URL}/categories/public?page=1&limit=50`);
    const existingCategories = categoriesResponse.data.data || [];
    
    console.log(`✅ Encontradas ${existingCategories.length} categorías existentes`);
    
    if (existingCategories.length > 0) {
      console.log('📂 Categorías disponibles:');
      existingCategories.slice(0, 10).forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
      });
      
      // Usar la primera categoría disponible
      const selectedCategory = existingCategories[0];
      console.log(`\n🎯 Usando categoría: ${selectedCategory.name}`);
      
      // Crear producto con la categoría existente
      await createTestProduct(selectedCategory);
      return;
    }

    // 2. Si no hay categorías, mostrar instrucciones para crearlas manualmente
    console.log('\n❌ No se encontraron categorías en el sistema');
    console.log('=====================================');
    console.log('');
    console.log('PASO 1: Crear categorías manualmente');
    console.log('');
    console.log('1. Ve a: http://localhost:3000/dashboard/categories');
    console.log('2. Crea estas categorías básicas:');
    console.log('');
    console.log('   📱 Electrónicos');
    console.log('      - Descripción: Productos electrónicos y tecnológicos');
    console.log('');
    console.log('   👕 Ropa');
    console.log('      - Descripción: Prendas de vestir y accesorios');
    console.log('');
    console.log('   🏠 Hogar');
    console.log('      - Descripción: Artículos para el hogar');
    console.log('');
    console.log('   💄 Cosméticos');
    console.log('      - Descripción: Productos de belleza y cuidado personal');
    console.log('');
    console.log('   🍔 Alimentos');
    console.log('      - Descripción: Productos alimenticios');
    console.log('');
    console.log('3. Después de crear las categorías, ejecuta este script nuevamente');
    console.log('');
    console.log('COMANDO: node create-categories-and-product.js');
    console.log('');

  } catch (error) {
    console.error('❌ Error al verificar categorías:', error.message);
    
    // Mostrar instrucciones de creación manual
    console.log('\n📝 INSTRUCCIONES PARA CREAR CATEGORÍAS MANUALMENTE');
    console.log('================================================');
    console.log('');
    console.log('1. Abre: http://localhost:3000/dashboard/categories');
    console.log('2. Haz clic en "Nueva Categoría" o "Agregar Categoría"');
    console.log('3. Crea al menos una categoría con:');
    console.log('   - Nombre: Electrónicos');
    console.log('   - Descripción: Productos electrónicos y tecnológicos');
    console.log('4. Guarda la categoría');
    console.log('5. Ejecuta este script nuevamente');
    console.log('');
  }
}

async function createTestProduct(category) {
  console.log('\n🛍️ Creando producto de prueba...');
  
  const productData = {
    name: 'Producto de Prueba',
    sku: 'TEST-001',
    description: `Producto de prueba para la categoría ${category.name}`,
    categoryId: category.id,
    costPrice: 10.00,
    salePrice: 19.99,
    stockQuantity: 100,
    minStock: 10
  };

  console.log('\n📦 Datos del producto:');
  console.log(JSON.stringify(productData, null, 2));

  // Intentar crear el producto (probablemente fallará por autenticación)
  try {
    const response = await axios.post(`${BASE_URL}/products`, productData);
    console.log('✅ ¡Producto creado exitosamente!', response.data);
    
    // Verificar que aparezca en el POS
    console.log('\n🎉 ÉXITO! Ahora puedes:');
    console.log('1. Ir a: http://localhost:3000/pos');
    console.log('2. Verificar que el producto aparezca en la lista');
    console.log('3. Agregarlo al carrito y probar una venta');
    
  } catch (error) {
    console.log('❌ No se pudo crear automáticamente:', error.response?.status, error.response?.data?.error || error.message);
    
    // Mostrar instrucciones manuales
    console.log('\n📝 CREAR PRODUCTO MANUALMENTE:');
    console.log('=============================');
    console.log('');
    console.log('1. Ve a: http://localhost:3000/dashboard/products');
    console.log('2. Haz clic en "Nuevo Producto"');
    console.log('3. Completa con estos datos:');
    console.log('');
    console.log(`   Nombre: ${productData.name}`);
    console.log(`   SKU: ${productData.sku}`);
    console.log(`   Descripción: ${productData.description}`);
    console.log(`   Categoría: ${category.name}`);
    console.log(`   Precio de Costo: $${productData.costPrice.toFixed(2)}`);
    console.log(`   Precio de Venta: $${productData.salePrice.toFixed(2)}`);
    console.log(`   Stock: ${productData.stockQuantity}`);
    console.log(`   Stock Mínimo: ${productData.minStock}`);
    console.log('');
    console.log('4. Guarda el producto');
    console.log('5. Ve a: http://localhost:3000/pos para probarlo');
    console.log('');
  }
}

// Ejecutar el script
createCategoriesAndProduct().catch(console.error);