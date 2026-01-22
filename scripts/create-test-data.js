const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🚀 Iniciando creación de datos de prueba...');

    // 1. Crear categorías primero
    console.log('📂 Creando categorías...');
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { name: 'Cosméticos' },
        update: {},
        create: {
          name: 'Cosméticos',
          description: 'Productos de belleza y cuidado personal'
        }
      }),
      prisma.category.upsert({
        where: { name: 'Maquillaje' },
        update: {},
        create: {
          name: 'Maquillaje',
          description: 'Productos de maquillaje facial y corporal'
        }
      }),
      prisma.category.upsert({
        where: { name: 'Cuidado de la Piel' },
        update: {},
        create: {
          name: 'Cuidado de la Piel',
          description: 'Productos para el cuidado y tratamiento de la piel'
        }
      }),
      prisma.category.upsert({
        where: { name: 'Fragancias' },
        update: {},
        create: {
          name: 'Fragancias',
          description: 'Perfumes y colonias'
        }
      })
    ]);

    console.log(`✅ Creadas ${categories.length} categorías`);

    // 2. Crear productos
    console.log('🛍️ Creando productos...');
    const products = [
      {
        name: 'Base de Maquillaje Líquida',
        sku: 'BASE001',
        categoryId: categories[1].id, // Maquillaje
        description: 'Base de maquillaje líquida de cobertura media',
        costPrice: 15.00,
        salePrice: 25.99,
        stockQuantity: 50,
        minStock: 10,
        shade: 'Medium',
        skinType: 'Mixta',
        coverage: 'Media',
        finish: 'Natural',
        volume: '30ml'
      },
      {
        name: 'Labial Mate',
        sku: 'LAB001',
        categoryId: categories[1].id, // Maquillaje
        description: 'Labial de larga duración con acabado mate',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 75,
        minStock: 15,
        shade: 'Rojo Clásico',
        finish: 'Mate',
        waterproof: true,
        volume: '3.5g'
      },
      {
        name: 'Crema Hidratante Facial',
        sku: 'CREMA001',
        categoryId: categories[2].id, // Cuidado de la Piel
        description: 'Crema hidratante para rostro con ácido hialurónico',
        costPrice: 12.00,
        salePrice: 22.99,
        stockQuantity: 30,
        minStock: 8,
        skinType: 'Todos los tipos',
        ingredients: 'Ácido Hialurónico, Vitamina E',
        volume: '50ml',
        vegan: true,
        crueltyFree: true
      },
      {
        name: 'Protector Solar SPF 50',
        sku: 'PROT001',
        categoryId: categories[2].id, // Cuidado de la Piel
        description: 'Protector solar facial con SPF 50',
        costPrice: 18.00,
        salePrice: 32.99,
        stockQuantity: 25,
        minStock: 5,
        spf: 50,
        skinType: 'Todos los tipos',
        waterproof: true,
        volume: '60ml'
      },
      {
        name: 'Perfume Floral',
        sku: 'PERF001',
        categoryId: categories[3].id, // Fragancias
        description: 'Perfume con notas florales frescas',
        costPrice: 25.00,
        salePrice: 45.99,
        stockQuantity: 20,
        minStock: 5,
        volume: '50ml'
      },
      {
        name: 'Máscara de Pestañas',
        sku: 'MASC001',
        categoryId: categories[1].id, // Maquillaje
        description: 'Máscara de pestañas voluminizadora',
        costPrice: 10.00,
        salePrice: 19.99,
        stockQuantity: 40,
        minStock: 10,
        waterproof: true,
        volume: '10ml'
      },
      {
        name: 'Serum Vitamina C',
        sku: 'SER001',
        categoryId: categories[2].id, // Cuidado de la Piel
        description: 'Serum antioxidante con vitamina C',
        costPrice: 20.00,
        salePrice: 35.99,
        stockQuantity: 15,
        minStock: 3,
        skinType: 'Todos los tipos',
        ingredients: 'Vitamina C, Ácido Ferúlico',
        volume: '30ml',
        vegan: true
      },
      {
        name: 'Rubor en Polvo',
        sku: 'RUB001',
        categoryId: categories[1].id, // Maquillaje
        description: 'Rubor en polvo compacto',
        costPrice: 7.00,
        salePrice: 14.99,
        stockQuantity: 35,
        minStock: 8,
        shade: 'Rosa Natural',
        finish: 'Satinado'
      }
    ];

    const createdProducts = [];
    for (const productData of products) {
      try {
        const product = await prisma.product.create({
          data: productData
        });
        createdProducts.push(product);
        console.log(`✅ Producto creado: ${product.name} (${product.sku})`);
      } catch (error) {
        console.error(`❌ Error creando producto ${productData.name}:`, error.message);
      }
    }

    console.log(`✅ Creados ${createdProducts.length} productos`);

    // 3. Crear algunos clientes de prueba
    console.log('👥 Creando clientes de prueba...');
    const customers = await Promise.all([
      prisma.customer.upsert({
        where: { email: 'maria.garcia@email.com' },
        update: {},
        create: {
          name: 'María García',
          email: 'maria.garcia@email.com',
          phone: '+1234567890',
          address: 'Calle Principal 123',
          customerType: 'regular',
          status: 'active',
          isActive: true
        }
      }),
      prisma.customer.upsert({
        where: { email: 'ana.lopez@email.com' },
        update: {},
        create: {
          name: 'Ana López',
          email: 'ana.lopez@email.com',
          phone: '+1234567891',
          address: 'Avenida Central 456',
          customerType: 'premium',
          status: 'active',
          isActive: true
        }
      }),
      prisma.customer.upsert({
        where: { email: 'carlos.martinez@email.com' },
        update: {},
        create: {
          name: 'Carlos Martínez',
          email: 'carlos.martinez@email.com',
          phone: '+1234567892',
          customerType: 'regular',
          status: 'active',
          isActive: true
        }
      })
    ]);

    console.log(`✅ Creados ${customers.length} clientes`);

    console.log('\n🎉 ¡Datos de prueba creados exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   - Categorías: ${categories.length}`);
    console.log(`   - Productos: ${createdProducts.length}`);
    console.log(`   - Clientes: ${customers.length}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();