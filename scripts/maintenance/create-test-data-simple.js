const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001/api';

async function createTestDataSimple() {
  console.log('🚀 Creando datos de prueba de forma simplificada...\n');

  try {
    // 1. Primero verificar si hay categorías existentes
    console.log('📋 Verificando categorías existentes...');
    
    try {
      const categoriesResponse = await axios.get(`${BASE_URL}/categories/public?page=1&limit=10`);
      console.log(`✅ Encontradas ${categoriesResponse.data.data?.length || 0} categorías existentes`);
      
      if (categoriesResponse.data.data && categoriesResponse.data.data.length > 0) {
        console.log('📂 Categorías disponibles:');
        categoriesResponse.data.data.forEach((cat, index) => {
          console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
        });
      }
    } catch (error) {
      console.log('❌ Error verificando categorías:', error.response?.data || error.message);
    }

    // 2. Verificar productos existentes
    console.log('\n📦 Verificando productos existentes...');
    
    try {
      const productsResponse = await axios.get(`${BASE_URL}/products/public?page=1&limit=10`);
      console.log(`✅ Encontrados ${productsResponse.data.products?.length || 0} productos existentes`);
      
      if (productsResponse.data.products && productsResponse.data.products.length > 0) {
        console.log('🛍️ Productos disponibles:');
        productsResponse.data.products.slice(0, 5).forEach((prod, index) => {
          console.log(`   ${index + 1}. ${prod.name} - $${prod.salePrice} (Stock: ${prod.stockQuantity})`);
        });
      }
    } catch (error) {
      console.log('❌ Error verificando productos:', error.response?.data || error.message);
    }

    // 3. Verificar estado del servidor
    console.log('\n❤️ Verificando estado del servidor...');
    
    try {
      const healthResponse = await axios.get('http://127.0.0.1:3001/health');
      console.log('✅ Servidor backend funcionando correctamente');
      console.log('📊 Estado:', healthResponse.data);
    } catch (error) {
      console.log('❌ Error verificando servidor:', error.message);
      console.log('💡 Asegúrate de que el servidor backend esté ejecutándose en el puerto 3001');
    }

    // 4. Verificar frontend
    console.log('\n🌐 Verificando frontend...');
    
    try {
      const frontendResponse = await axios.get('http://localhost:3000', { timeout: 5000 });
      console.log('✅ Frontend funcionando correctamente');
    } catch (error) {
      console.log('❌ Error verificando frontend:', error.message);
      console.log('💡 Asegúrate de que el frontend esté ejecutándose en el puerto 3000');
    }

    // 5. Resumen y recomendaciones
    console.log('\n📋 RESUMEN Y RECOMENDACIONES:');
    console.log('=====================================');
    console.log('');
    console.log('Para crear datos de prueba, puedes:');
    console.log('');
    console.log('1. 🎯 Usar el Panel de Administración:');
    console.log('   - Ir a http://localhost:3000/dashboard/categories');
    console.log('   - Crear categorías manualmente');
    console.log('   - Ir a http://localhost:3000/dashboard/products');
    console.log('   - Crear productos manualmente');
    console.log('');
    console.log('2. 🛒 Probar el POS:');
    console.log('   - Ir a http://localhost:3000/pos');
    console.log('   - Verificar que se muestren los productos');
    console.log('   - Probar agregar productos al carrito');
    console.log('   - Probar el proceso de checkout');
    console.log('');
    console.log('3. 📊 Verificar Dashboard:');
    console.log('   - Ir a http://localhost:3000/dashboard');
    console.log('   - Revisar estadísticas y reportes');
    console.log('');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar el script
createTestDataSimple().catch(console.error);