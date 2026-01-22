/**
 * Script para probar el endpoint de ofertas
 */

async function testOffersAPI() {
  console.log('🧪 Probando endpoint de ofertas...\n');

  const baseUrl = 'http://localhost:3000';
  const endpoints = [
    '/api/offers?status=active&limit=10',
    '/api/offers?status=upcoming&limit=10',
    '/api/offers?status=ended&limit=10',
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📡 GET ${endpoint}`);
    console.log('='.repeat(60));

    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Ofertas encontradas: ${data.data?.length || 0}`);
        
        if (data.data && data.data.length > 0) {
          console.log('\n   Primeras ofertas:');
          data.data.slice(0, 3).forEach((offer: any, i: number) => {
            console.log(`   ${i + 1}. ${offer.product.name}`);
            console.log(`      Promoción: ${offer.promotion?.name || 'N/A'}`);
            console.log(`      Precio base: $${offer.product.basePrice}`);
            console.log(`      Precio oferta: $${offer.offerPrice}`);
            console.log(`      Descuento: ${offer.discountPercent}%`);
          });
        }

        console.log(`\n   Paginación:`);
        console.log(`   - Página: ${data.pagination?.page}`);
        console.log(`   - Total: ${data.pagination?.total}`);
        console.log(`   - Páginas: ${data.pagination?.totalPages}`);
      } else {
        console.log(`❌ Status: ${response.status}`);
        console.log(`   Error: ${data.error || 'Unknown error'}`);
        if (data.details) {
          console.log(`   Detalles: ${data.details}`);
        }
      }
    } catch (error: any) {
      console.log(`❌ Error de conexión: ${error.message}`);
      console.log(`   ℹ️  Asegúrate de que el servidor esté corriendo en ${baseUrl}`);
    }
  }

  console.log('\n✅ Pruebas completadas\n');
}

testOffersAPI().catch(console.error);
