const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001/api';

// Token de prueba - necesitarás obtener uno válido del sistema
const AUTH_TOKEN = 'Bearer test-token'; // Este será reemplazado por un token real

async function createProductsForPOS() {
  console.log('🚀 Creando productos para el POS...\n');

  try {
    // 1. Obtener categorías disponibles
    console.log('📋 Obteniendo categorías disponibles...');
    
    const categoriesResponse = await axios.get(`${BASE_URL}/categories/public?page=1&limit=50`);
    const categories = categoriesResponse.data.data || [];
    
    console.log(`✅ Encontradas ${categories.length} categorías`);
    
    // Seleccionar algunas categorías para crear productos
    const selectedCategories = categories.filter(cat => 
      ['Cosméticos', 'Maquillaje', 'Cuidado de la Piel', 'Fragancias', 'Electrónicos', 'Ropa'].includes(cat.name)
    );
    
    console.log('📂 Categorías seleccionadas para productos:');
    selectedCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
    });

    // 2. Definir productos de prueba
    const productsToCreate = [
      // Cosméticos
      {
        name: 'Base de Maquillaje Líquida HD',
        sku: 'BASE-HD-001',
        description: 'Base de maquillaje líquida de alta definición, cobertura media a completa',
        costPrice: 15.00,
        salePrice: 29.99,
        stockQuantity: 50,
        minStock: 10,
        categoryName: 'Cosméticos'
      },
      {
        name: 'Labial Mate Larga Duración',
        sku: 'LAB-MATE-001',
        description: 'Labial mate de larga duración, resistente al agua',
        costPrice: 8.00,
        salePrice: 18.99,
        stockQuantity: 75,
        minStock: 15,
        categoryName: 'Maquillaje'
      },
      {
        name: 'Crema Hidratante Facial',
        sku: 'CREMA-HID-001',
        description: 'Crema hidratante facial con ácido hialurónico y vitamina E',
        costPrice: 12.00,
        salePrice: 24.99,
        stockQuantity: 30,
        minStock: 8,
        categoryName: 'Cuidado de la Piel'
      },
      {
        name: 'Perfume Floral Elegante',
        sku: 'PERF-FLOR-001',
        description: 'Perfume con notas florales frescas y elegantes, 50ml',
        costPrice: 25.00,
        salePrice: 49.99,
        stockQuantity: 20,
        minStock: 5,
        categoryName: 'Fragancias'
      },
      {
        name: 'Smartphone Android 128GB',
        sku: 'PHONE-AND-128',
        description: 'Smartphone Android con 128GB de almacenamiento, cámara dual',
        costPrice: 200.00,
        salePrice: 399.99,
        stockQuantity: 15,
        minStock: 3,
        categoryName: 'Electrónicos'
      },
      {
        name: 'Camiseta Básica Algodón',
        sku: 'CAM-ALG-001',
        description: 'Camiseta básica de algodón 100%, disponible en varios colores',
        costPrice: 8.00,
        salePrice: 19.99,
        stockQuantity: 100,
        minStock: 20,
        categoryName: 'Ropa'
      },
      {
        name: 'Máscara de Pestañas Volumen',
        sku: 'MASC-VOL-001',
        description: 'Máscara de pestañas para volumen extremo, resistente al agua',
        costPrice: 10.00,
        salePrice: 22.99,
        stockQuantity: 40,
        minStock: 10,
        categoryName: 'Maquillaje'
      },
      {
        name: 'Serum Vitamina C',
        sku: 'SER-VIT-C-001',
        description: 'Serum antioxidante con vitamina C pura, 30ml',
        costPrice: 18.00,
        salePrice: 34.99,
        stockQuantity: 25,
        minStock: 5,
        categoryName: 'Cuidado de la Piel'
      }
    ];

    // 3. Asignar categoryId a cada producto
    const productsWithCategoryId = productsToCreate.map(product => {
      const category = selectedCategories.find(cat => cat.name === product.categoryName);
      if (!category) {
        console.log(`⚠️ Categoría no encontrada para ${product.name}: ${product.categoryName}`);
        return null;
      }
      
      const { categoryName, ...productData } = product;
      return {
        ...productData,
        categoryId: category.id
      };
    }).filter(Boolean);

    console.log(`\n🛍️ Preparados ${productsWithCategoryId.length} productos para crear`);

    // 4. Mostrar instrucciones para crear productos manualmente
    console.log('\n📝 INSTRUCCIONES PARA CREAR PRODUCTOS:');
    console.log('=====================================');
    console.log('');
    console.log('Como no tenemos autenticación automática, puedes crear estos productos manualmente:');
    console.log('');
    console.log('1. Ve a: http://localhost:3000/dashboard/products');
    console.log('2. Haz clic en "Nuevo Producto"');
    console.log('3. Usa los siguientes datos:');
    console.log('');

    productsWithCategoryId.forEach((product, index) => {
      const category = selectedCategories.find(cat => cat.id === product.categoryId);
      console.log(`--- PRODUCTO ${index + 1} ---`);
      console.log(`Nombre: ${product.name}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Descripción: ${product.description}`);
      console.log(`Categoría: ${category?.name} (ID: ${product.categoryId})`);
      console.log(`Precio de Costo: $${product.costPrice.toFixed(2)}`);
      console.log(`Precio de Venta: $${product.salePrice.toFixed(2)}`);
      console.log(`Stock Inicial: ${product.stockQuantity}`);
      console.log(`Stock Mínimo: ${product.minStock}`);
      console.log('');
    });

    console.log('🎯 DESPUÉS DE CREAR LOS PRODUCTOS:');
    console.log('1. Ve a: http://localhost:3000/pos');
    console.log('2. Verifica que los productos aparezcan en el catálogo');
    console.log('3. Prueba agregar productos al carrito');
    console.log('4. Prueba el proceso de checkout completo');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Ejecutar el script
createProductsForPOS().catch(console.error);