const path = require('path');
require('dotenv').config();

// Import the Supabase adapter from the backend
const { supabasePrisma } = require('./apps/backend/dist/config/supabase-prisma');

async function createTestProduct() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // First, get an existing category
    console.log('📂 Obteniendo categorías existentes...');
    const categories = await supabasePrisma.category.findMany({
      select: { id: true, name: true }
    });

    if (!categories || categories.length === 0) {
      console.error('❌ No se encontraron categorías');
      return;
    }

    const category = categories[0];
    console.log(`✅ Usando categoría: ${category.name} (ID: ${category.id})`);

    // Create a test product
    console.log('🛍️ Creando producto de prueba...');
    const productData = {
      name: 'Producto de Prueba Checkout',
      sku: 'TEST-CHECKOUT-001',
      description: 'Producto creado para probar el flujo de checkout público',
      categoryId: category.id,
      costPrice: 8.00,
      salePrice: 15.50,
      stockQuantity: 100,
      minStock: 5,
      images: ''
    };

    const product = await supabasePrisma.product.create({
      data: productData
    });

    console.log('✅ ¡Producto de prueba creado exitosamente!');
    console.log('📋 Detalles del producto:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Nombre: ${product.name}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Precio de venta: $${product.salePrice}`);
    console.log(`   Stock: ${product.stockQuantity}`);
    console.log(`   Categoría: ${category.name}`);

    return product;
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

createTestProduct()
  .then(() => {
    console.log('🎉 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });