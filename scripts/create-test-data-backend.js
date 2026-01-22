const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001/api';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnprbWZsb2l1cndoeWRwdmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjM1MTksImV4cCI6MjA3NDgzOTUxOX0.Ouc409D7kZYtOEjALVjmjHCX6R8YjdL1a-WcFhDJk0U';

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function createTestData() {
  try {
    console.log('🚀 Iniciando creación de datos de prueba usando la API del backend...');

    // 1. Crear categorías primero
    console.log('📂 Creando categorías...');
    
    const categoriesData = [
      { name: 'Cosméticos', description: 'Productos de belleza y cuidado personal' },
      { name: 'Maquillaje', description: 'Productos de maquillaje facial y corporal' },
      { name: 'Cuidado de la Piel', description: 'Productos para el cuidado y tratamiento de la piel' },
      { name: 'Fragancias', description: 'Perfumes y colonias' }
    ];

    const categories = [];
    for (const categoryData of categoriesData) {
      try {
        const response = await axios.post(`${BASE_URL}/categories`, categoryData, { headers });
        categories.push(response.data);
        console.log(`✅ Categoría creada: ${response.data.name}`);
      } catch (error) {
        if (error.response?.status === 409) {
          // La categoría ya existe, obtenerla
          try {
            const existingResponse = await axios.get(`${BASE_URL}/categories`, { headers });
            const existing = existingResponse.data.categories.find(c => c.name === categoryData.name);
            if (existing) {
              categories.push(existing);
              console.log(`ℹ️ Categoría ya existe: ${existing.name}`);
            }
          } catch (getError) {
            console.error(`❌ Error obteniendo categoría ${categoryData.name}:`, getError.message);
          }
        } else {
          console.error(`❌ Error creando categoría ${categoryData.name}:`, error.response?.data || error.message);
        }
      }
    }

    console.log(`✅ Total categorías disponibles: ${categories.length}`);

    // 2. Crear productos
    console.log('🛍️ Creando productos...');
    
    const productsData = [
      {
        name: 'Base de Maquillaje Líquida',
        sku: 'BASE001',
        categoryId: categories.find(c => c.name === 'Maquillaje')?.id,
        description: 'Base de maquillaje líquida de cobertura media - Tono Medium',
        costPrice: 15.00,
        salePrice: 25.99,
        stockQuantity: 50,
        minStock: 10
      },
      {
        name: 'Labial Mate',
        sku: 'LAB001',
        categoryId: categories.find(c => c.name === 'Maquillaje')?.id,
        description: 'Labial de larga duración con acabado mate - Rojo Clásico',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 75,
        minStock: 15
      },
      {
        name: 'Crema Hidratante Facial',
        sku: 'CREMA001',
        categoryId: categories.find(c => c.name === 'Cuidado de la Piel')?.id,
        description: 'Crema hidratante para rostro con ácido hialurónico - 50ml',
        costPrice: 12.00,
        salePrice: 22.99,
        stockQuantity: 30,
        minStock: 8
      },
      {
        name: 'Protector Solar SPF 50',
        sku: 'PROT001',
        categoryId: categories.find(c => c.name === 'Cuidado de la Piel')?.id,
        description: 'Protector solar facial con SPF 50 - Resistente al agua - 60ml',
        costPrice: 18.00,
        salePrice: 32.99,
        stockQuantity: 25,
        minStock: 5
      },
      {
        name: 'Perfume Floral',
        sku: 'PERF001',
        categoryId: categories.find(c => c.name === 'Fragancias')?.id,
        description: 'Perfume con notas florales frescas - 50ml',
        costPrice: 25.00,
        salePrice: 45.99,
        stockQuantity: 20,
        minStock: 5
      },
      {
        name: 'Máscara de Pestañas',
        sku: 'MASC001',
        categoryId: categories.find(c => c.name === 'Maquillaje')?.id,
        description: 'Máscara de pestañas voluminizadora resistente al agua - 10ml',
        costPrice: 10.00,
        salePrice: 19.99,
        stockQuantity: 40,
        minStock: 10
      },
      {
        name: 'Serum Vitamina C',
        sku: 'SER001',
        categoryId: categories.find(c => c.name === 'Cuidado de la Piel')?.id,
        description: 'Serum antioxidante con vitamina C y ácido ferúlico - 30ml',
        costPrice: 20.00,
        salePrice: 35.99,
        stockQuantity: 15,
        minStock: 3
      },
      {
        name: 'Rubor en Polvo',
        sku: 'RUB001',
        categoryId: categories.find(c => c.name === 'Maquillaje')?.id,
        description: 'Rubor en polvo compacto - Rosa Natural - Acabado satinado',
        costPrice: 7.00,
        salePrice: 14.99,
        stockQuantity: 35,
        minStock: 8
      }
    ];

    const products = [];
    for (const productData of productsData) {
      if (!productData.categoryId) {
        console.log(`⚠️ Saltando producto ${productData.name} - categoría no encontrada`);
        continue;
      }

      try {
        const response = await axios.post(`${BASE_URL}/products`, productData, { headers });
        products.push(response.data);
        console.log(`✅ Producto creado: ${response.data.name} (${response.data.sku})`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️ Producto ya existe: ${productData.name} (${productData.sku})`);
        } else {
          console.error(`❌ Error creando producto ${productData.name}:`, error.response?.data || error.message);
        }
      }
    }

    console.log(`✅ Total productos creados: ${products.length}`);

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

    const customers = [];
    for (const customerData of customersData) {
      try {
        const response = await axios.post(`${BASE_URL}/customers`, customerData, { headers });
        customers.push(response.data);
        console.log(`✅ Cliente creado: ${response.data.name}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️ Cliente ya existe: ${customerData.name}`);
        } else {
          console.error(`❌ Error creando cliente ${customerData.name}:`, error.response?.data || error.message);
        }
      }
    }

    console.log(`✅ Total clientes creados: ${customers.length}`);

    console.log('\n🎉 ¡Datos de prueba creados exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   - Categorías: ${categories.length}`);
    console.log(`   - Productos: ${products.length}`);
    console.log(`   - Clientes: ${customers.length}`);

    // 4. Verificar que los datos se crearon correctamente
    console.log('\n🔍 Verificando datos creados...');
    
    try {
      const productsResponse = await axios.get(`${BASE_URL}/products`, { headers });
      console.log(`\n📋 Productos en el sistema: ${productsResponse.data.pagination.total}`);
      
      if (productsResponse.data.products.length > 0) {
        console.log('   Productos disponibles:');
        productsResponse.data.products.forEach(product => {
          console.log(`   - ${product.name} (${product.sku}) - Stock: ${product.stockQuantity} - Precio: $${product.salePrice}`);
        });
      }
    } catch (error) {
      console.error('❌ Error verificando productos:', error.message);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

createTestData();