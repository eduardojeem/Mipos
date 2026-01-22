const axios = require('axios');

async function testSimpleAuth() {
  console.log('🔍 Probando autenticación simple con el backend...\n');
  
  const baseURL = 'http://127.0.0.1:3001/api';
  
  // Usar un token de prueba simple (simulado)
  const testToken = 'test-token-123';
  
  try {
    // 1. Probar endpoint de salud del servidor
    console.log('1. Verificando que el servidor esté activo...');
    const healthResponse = await axios.get('http://127.0.0.1:3001/health', {
      timeout: 5000
    });
    console.log('✅ Servidor activo:', healthResponse.data);
    
    console.log('\n2. Probando endpoint con token de prueba...');
    
    // 2. Probar endpoint que requiere autenticación
    try {
      const response = await axios.get(`${baseURL}/customers/mock`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      console.log('✅ Endpoint mock exitoso:', response.data);
    } catch (error) {
      console.log('❌ Error en endpoint mock:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
      
      if (error.response?.status === 401) {
        console.log('💡 Error 401: El middleware de autenticación está funcionando pero rechaza el token de prueba');
      }
    }
    
    console.log('\n3. Probando endpoint sin autenticación...');
    
    // 3. Probar endpoint público
    try {
      const publicResponse = await axios.get(`${baseURL}/products/public`, {
        timeout: 10000
      });
      console.log('✅ Endpoint público exitoso');
    } catch (error) {
      console.log('❌ Error en endpoint público:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
    }
    
  } catch (error) {
    console.error('💥 Error general:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 El servidor backend no está ejecutándose en el puerto 3001');
    }
  }
}

testSimpleAuth();