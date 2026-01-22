const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001/api';

async function createSingleTestProduct() {
  console.log('🚀 Creando un producto de prueba...\n');

  try {
    // 1. Obtener categorías disponibles
    console.log('📋 Obteniendo categorías...');
    const categoriesResponse = await axios.get(`${BASE_URL}/categories/public?page=1&limit=50`);
    const categories = categoriesResponse.data.data || [];
    
    console.log(`✅ Encontradas ${categories.length} categorías`);
    
    // Buscar una categoría específica (Cosméticos)
    const cosmeticosCategory = categories.find(cat => cat.name === 'Cosméticos');
    
    if (!cosmeticosCategory) {
      console.log('❌ No se encontró la categoría "Cosméticos"');
      console.log('📂 Categorías disponibles:');
      categories.slice(0, 5).forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
      });
      return;
    }

    console.log(`📂 Usando categoría: ${cosmeticosCategory.name} (ID: ${cosmeticosCategory.id})`);

    // 2. Intentar crear producto usando diferentes métodos
    const productData = {
      name: 'Base de Maquillaje Test',
      sku: 'BASE-TEST-001',
      description: 'Base de maquillaje líquida para pruebas del POS',
      categoryId: cosmeticosCategory.id,
      costPrice: 15.00,
      salePrice: 29.99,
      stockQuantity: 50,
      minStock: 10
    };

    console.log('\n🛍️ Datos del producto a crear:');
    console.log(JSON.stringify(productData, null, 2));

    // Método 1: Intentar con endpoint público (probablemente fallará)
    console.log('\n🔄 Método 1: Intentando con endpoint público...');
    try {
      const response = await axios.post(`${BASE_URL}/products/public`, productData);
      console.log('✅ Producto creado exitosamente:', response.data);
      return;
    } catch (error) {
      console.log('❌ Método 1 falló:', error.response?.status, error.response?.data?.error || error.message);
    }

    // Método 2: Intentar con endpoint protegido sin auth (fallará)
    console.log('\n🔄 Método 2: Intentando con endpoint protegido...');
    try {
      const response = await axios.post(`${BASE_URL}/products`, productData);
      console.log('✅ Producto creado exitosamente:', response.data);
      return;
    } catch (error) {
      console.log('❌ Método 2 falló:', error.response?.status, error.response?.data?.error || error.message);
    }

    // Método 3: Intentar con token falso
    console.log('\n🔄 Método 3: Intentando con token de prueba...');
    try {
      const response = await axios.post(`${BASE_URL}/products`, productData, {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Producto creado exitosamente:', response.data);
      return;
    } catch (error) {
      console.log('❌ Método 3 falló:', error.response?.status, error.response?.data?.error || error.message);
    }

    // Si todos los métodos fallan, mostrar instrucciones
    console.log('\n📝 TODOS LOS MÉTODOS AUTOMÁTICOS FALLARON');
    console.log('=====================================');
    console.log('');
    console.log('Para crear el producto manualmente:');
    console.log('');
    console.log('1. Ve a: http://localhost:3000/dashboard/products');
    console.log('2. Haz clic en "Nuevo Producto" o "Agregar Producto"');
    console.log('3. Completa el formulario con estos datos:');
    console.log('');
    console.log(`   Nombre: ${productData.name}`);
    console.log(`   SKU: ${productData.sku}`);
    console.log(`   Descripción: ${productData.description}`);
    console.log(`   Categoría: ${cosmeticosCategory.name}`);
    console.log(`   Precio de Costo: $${productData.costPrice.toFixed(2)}`);
    console.log(`   Precio de Venta: $${productData.salePrice.toFixed(2)}`);
    console.log(`   Stock Inicial: ${productData.stockQuantity}`);
    console.log(`   Stock Mínimo: ${productData.minStock}`);
    console.log('');
    console.log('4. Guarda el producto');
    console.log('5. Ve a: http://localhost:3000/pos para verificar que aparezca');
    console.log('');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar el script
createSingleTestProduct().catch(console.error);