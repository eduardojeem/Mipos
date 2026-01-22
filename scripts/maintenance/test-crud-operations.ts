import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestProduct {
  name: string;
  sku: string;
  categoryId: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStock: number;
}

async function testCRUDOperations() {
  try {
    console.log('🧪 Iniciando pruebas de operaciones CRUD para productos...\n');

    // First, create categories for testing
    console.log('0️⃣ SETUP - Creando categorías de prueba...');
    
    const testCategories = [
      { name: 'Electrónicos', description: 'Dispositivos electrónicos' },
      { name: 'Accesorios', description: 'Accesorios varios' }
    ];

    const createdCategories = [];
    for (const category of testCategories) {
      try {
        const created = await prisma.category.create({
          data: category
        });
        createdCategories.push(created);
        console.log(`✅ Categoría creada: ${created.name} (ID: ${created.id})`);
      } catch (error) {
        // Category might already exist, try to find it
        const existing = await prisma.category.findUnique({
          where: { name: category.name }
        });
        if (existing) {
          createdCategories.push(existing);
          console.log(`ℹ️ Categoría existente: ${existing.name} (ID: ${existing.id})`);
        }
      }
    }

    // CREATE - Crear productos de prueba
    console.log('\n1️⃣ CREATE - Creando productos de prueba...');
    
    const testProducts: TestProduct[] = [
      {
        name: 'Laptop Gaming',
        sku: 'LAP-GAM-001',
        categoryId: createdCategories[0].id,
        description: 'Laptop para gaming de alta gama',
        costPrice: 1000.00,
        salePrice: 1299.99,
        stockQuantity: 10,
        minStock: 2
      },
      {
        name: 'Mouse Inalámbrico',
        sku: 'MOU-WIR-001',
        categoryId: createdCategories[1].id,
        description: 'Mouse ergonómico inalámbrico',
        costPrice: 20.00,
        salePrice: 29.99,
        stockQuantity: 50,
        minStock: 5
      },
      {
        name: 'Teclado Mecánico',
        sku: 'KEY-MEC-001',
        categoryId: createdCategories[1].id,
        description: 'Teclado mecánico RGB',
        costPrice: 60.00,
        salePrice: 89.99,
        stockQuantity: 25,
        minStock: 3
      }
    ];

    const createdProducts = [];
    for (const product of testProducts) {
      const created = await prisma.product.create({
        data: product
      });
      createdProducts.push(created);
      console.log(`✅ Producto creado: ${created.name} (ID: ${created.id})`);
    }

    // READ - Leer productos
    console.log('\n2️⃣ READ - Leyendo productos...');
    
    // Leer todos los productos
    const allProducts = await prisma.product.findMany({
      include: { category: true }
    });
    console.log(`📋 Total de productos en la base de datos: ${allProducts.length}`);
    
    // Leer un producto específico
    const firstProduct = await prisma.product.findUnique({
      where: { id: createdProducts[0].id },
      include: { category: true }
    });
    console.log(`🔍 Producto específico: ${firstProduct?.name} - Categoría: ${firstProduct?.category.name}`);
    
    // Buscar productos por categoría
    const electronicProducts = await prisma.product.findMany({
      where: { category: { name: 'Electrónicos' } },
      include: { category: true }
    });
    console.log(`🏷️ Productos en categoría 'Electrónicos': ${electronicProducts.length}`);
    
    // Buscar productos con stock bajo
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stockQuantity: {
          lte: 5
        }
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStock: true
      }
    });
    console.log(`⚠️ Productos con stock bajo: ${lowStockProducts.length}`);

    // UPDATE - Actualizar productos
    console.log('\n3️⃣ UPDATE - Actualizando productos...');
    
    // Actualizar precio de un producto
    const updatedProduct = await prisma.product.update({
      where: { id: createdProducts[0].id },
      data: { 
        salePrice: 1199.99,
        stockQuantity: 8
      }
    });
    console.log(`✏️ Producto actualizado: ${updatedProduct.name} - Nuevo precio: $${updatedProduct.salePrice}`);
    
    // Actualización masiva - reducir stock
    const bulkUpdate = await prisma.product.updateMany({
      where: { category: { name: 'Accesorios' } },
      data: { stockQuantity: { decrement: 1 } }
    });
    console.log(`📦 Actualización masiva: ${bulkUpdate.count} productos de 'Accesorios' actualizados`);

    // Verificar productos con stock crítico
    const criticalStock = await prisma.product.findMany({
      where: {
        OR: [
          { stockQuantity: { lte: 5 } },
          {
            stockQuantity: {
              lte: prisma.product.fields.minStock
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStock: true
      }
    });
    
    if (criticalStock.length > 0) {
      console.log('\n⚠️ Productos con stock crítico:');
      criticalStock.forEach(product => {
        console.log(`   - ${product.name}: ${product.stockQuantity} unidades (mínimo: ${product.minStock})`);
      });
    }

    // DELETE - Eliminar productos
    console.log('\n4️⃣ DELETE - Eliminando productos de prueba...');
    
    // Eliminar un producto específico
    const deletedProduct = await prisma.product.delete({
      where: { id: createdProducts[2].id }
    });
    console.log(`🗑️ Producto eliminado: ${deletedProduct.name}`);
    
    // Eliminar productos restantes
    const deleteResult = await prisma.product.deleteMany({
      where: {
        id: {
          in: createdProducts.slice(0, 2).map(p => p.id)
        }
      }
    });
    console.log(`🗑️ Productos eliminados en lote: ${deleteResult.count}`);

    // Limpiar categorías de prueba
    await prisma.category.deleteMany({
      where: {
        id: {
          in: createdCategories.map(c => c.id)
        }
      }
    });
    console.log(`🗑️ Categorías de prueba eliminadas`);

    // Verificación final
    console.log('\n5️⃣ VERIFICACIÓN FINAL...');
    const finalCount = await prisma.product.count();
    console.log(`📊 Total de productos después de las pruebas: ${finalCount}`);

    console.log('\n✅ Todas las operaciones CRUD completadas exitosamente!');
    
    // Estadísticas de rendimiento
    console.log('\n📈 ESTADÍSTICAS DE RENDIMIENTO:');
    console.log('- Operaciones CREATE: ✅ Exitosas');
    console.log('- Operaciones READ: ✅ Exitosas');
    console.log('- Operaciones UPDATE: ✅ Exitosas');
    console.log('- Operaciones DELETE: ✅ Exitosas');
    console.log('- Consultas complejas: ✅ Exitosas');
    console.log('- Manejo de relaciones: ✅ Exitosas');

  } catch (error) {
    console.error('❌ Error durante las pruebas CRUD:', error);
    
    if (error instanceof Error) {
      console.error('Detalles del error:', error.message);
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Conexión a la base de datos cerrada');
  }
}

// Ejecutar las pruebas
testCRUDOperations();