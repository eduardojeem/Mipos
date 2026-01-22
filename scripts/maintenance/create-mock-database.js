const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Configurar Prisma para usar SQLite local
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db'
    }
  }
});

async function createMockDatabase() {
  console.log('🔧 Configurando base de datos local SQLite...\n');
  
  try {
    // 1. Crear archivo de base de datos SQLite si no existe
    const dbPath = path.join(__dirname, 'dev.db');
    console.log('📁 Ubicación de la base de datos:', dbPath);
    
    // 2. Conectar a la base de datos
    console.log('1. Conectando a la base de datos local...');
    await prisma.$connect();
    console.log('✅ Conexión establecida exitosamente');
    
    // 3. Crear datos de prueba básicos
    console.log('\n2. Creando datos de prueba...');
    
    // Crear categorías
    const categories = [
      { name: 'Electrónicos', description: 'Productos electrónicos' },
      { name: 'Ropa', description: 'Prendas de vestir' },
      { name: 'Hogar', description: 'Artículos para el hogar' }
    ];
    
    for (const cat of categories) {
      try {
        await prisma.category.upsert({
          where: { name: cat.name },
          update: {},
          create: {
            name: cat.name,
            description: cat.description,
            isActive: true
          }
        });
        console.log(`✅ Categoría creada: ${cat.name}`);
      } catch (error) {
        console.log(`⚠️ Categoría ya existe: ${cat.name}`);
      }
    }
    
    // Crear productos
    const products = [
      {
        name: 'Smartphone Samsung',
        description: 'Teléfono inteligente Samsung Galaxy',
        price: 299.99,
        stock: 50,
        categoryName: 'Electrónicos'
      },
      {
        name: 'Camiseta Básica',
        description: 'Camiseta de algodón básica',
        price: 19.99,
        stock: 100,
        categoryName: 'Ropa'
      },
      {
        name: 'Lámpara LED',
        description: 'Lámpara LED de escritorio',
        price: 45.99,
        stock: 25,
        categoryName: 'Hogar'
      }
    ];
    
    for (const prod of products) {
      try {
        const category = await prisma.category.findFirst({
          where: { name: prod.categoryName }
        });
        
        if (category) {
          await prisma.product.upsert({
            where: { name: prod.name },
            update: {},
            create: {
              name: prod.name,
              description: prod.description,
              price: prod.price,
              stock: prod.stock,
              categoryId: category.id,
              isActive: true
            }
          });
          console.log(`✅ Producto creado: ${prod.name}`);
        }
      } catch (error) {
        console.log(`⚠️ Error creando producto ${prod.name}:`, error.message);
      }
    }
    
    // Crear usuario de prueba
    console.log('\n3. Creando usuario de prueba...');
    
    try {
      const testUser = await prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: {},
        create: {
          id: '12345678-90ab-cdef-1234-567890abcdef',
          email: 'admin@test.com',
          fullName: 'Administrador de Prueba',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('✅ Usuario de prueba creado:', testUser.email);
    } catch (error) {
      console.log('⚠️ Error creando usuario:', error.message);
    }
    
    // 4. Verificar datos creados
    console.log('\n4. Verificando datos creados...');
    
    const categoryCount = await prisma.category.count();
    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    
    console.log(`📊 Resumen de datos:`);
    console.log(`   - Categorías: ${categoryCount}`);
    console.log(`   - Productos: ${productCount}`);
    console.log(`   - Usuarios: ${userCount}`);
    
    // 5. Mostrar algunos datos de muestra
    console.log('\n5. Datos de muestra:');
    
    const sampleProducts = await prisma.product.findMany({
      take: 3,
      include: { category: true },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        category: { select: { name: true } }
      }
    });
    
    console.log('📦 Productos de muestra:');
    sampleProducts.forEach(p => {
      console.log(`   - ${p.name} (${p.category.name}): $${p.price} - Stock: ${p.stock}`);
    });
    
    console.log('\n🎉 Base de datos local configurada exitosamente!');
    console.log('💡 Ahora puedes usar la aplicación con datos de prueba locales.');
    
  } catch (error) {
    console.error('❌ Error configurando base de datos local:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMockDatabase().catch(console.error);