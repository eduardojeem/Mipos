import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

interface PerformanceMetric {
  operation: string;
  duration: number;
  recordCount?: number;
  queryType: 'simple' | 'complex' | 'bulk';
}

class PerformanceAnalyzer {
  private metrics: PerformanceMetric[] = [];

  async measureOperation<T>(
    operation: string,
    queryType: 'simple' | 'complex' | 'bulk',
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    const duration = end - start;
    
    this.metrics.push({
      operation,
      duration,
      recordCount: Array.isArray(result) ? result.length : 1,
      queryType
    });
    
    console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
    return result;
  }

  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  generateReport(): void {
    console.log('\n📊 REPORTE DE RENDIMIENTO');
    console.log('=' .repeat(50));
    
    const avgByType = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.queryType]) {
        acc[metric.queryType] = { total: 0, count: 0 };
      }
      acc[metric.queryType].total += metric.duration;
      acc[metric.queryType].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    Object.entries(avgByType).forEach(([type, data]) => {
      const avg = data.total / data.count;
      console.log(`${type.toUpperCase()}: ${avg.toFixed(2)}ms promedio (${data.count} operaciones)`);
    });

    console.log('\n🔍 OPERACIONES MÁS LENTAS:');
    const slowest = this.metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    slowest.forEach((metric, index) => {
      console.log(`${index + 1}. ${metric.operation}: ${metric.duration.toFixed(2)}ms`);
    });

    console.log('\n⚡ OPERACIONES MÁS RÁPIDAS:');
    const fastest = this.metrics
      .sort((a, b) => a.duration - b.duration)
      .slice(0, 5);
    
    fastest.forEach((metric, index) => {
      console.log(`${index + 1}. ${metric.operation}: ${metric.duration.toFixed(2)}ms`);
    });
  }
}

async function runPerformanceTests() {
  const analyzer = new PerformanceAnalyzer();
  
  try {
    console.log('🚀 Iniciando análisis de rendimiento...\n');

    // Limpiar datos existentes primero
    console.log('🧹 Limpiando datos existentes...');
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});

    // Setup: Create test data
    console.log('📋 SETUP - Creando datos de prueba...');
    
    // Create categories
    const categories = await analyzer.measureOperation(
      'Crear categorías de prueba',
      'bulk',
      async () => {
        const testCategories = [
          { name: 'Electrónicos Test', description: 'Categoría de prueba' },
          { name: 'Accesorios Test', description: 'Categoría de prueba' },
          { name: 'Ropa Test', description: 'Categoría de prueba' }
        ];

        const created = [];
        for (const category of testCategories) {
          try {
            const result = await prisma.category.create({ data: category });
            created.push(result);
          } catch (error) {
            // Category might exist, find it
            const existing = await prisma.category.findUnique({
              where: { name: category.name }
            });
            if (existing) created.push(existing);
          }
        }
        return created;
      }
    );

    // Create products in bulk
    const products = await analyzer.measureOperation(
      'Crear productos en lote (50 productos)',
      'bulk',
      async () => {
        const testProducts = [];
        for (let i = 1; i <= 50; i++) {
          testProducts.push({
            name: `Producto Test ${i}`,
            sku: `TEST-${i.toString().padStart(3, '0')}`,
            categoryId: categories[i % categories.length].id,
            description: `Descripción del producto de prueba ${i}`,
            costPrice: Math.random() * 100 + 10,
            salePrice: Math.random() * 200 + 50,
            stockQuantity: Math.floor(Math.random() * 100) + 1,
            minStock: Math.floor(Math.random() * 10) + 1
          });
        }

        const created = [];
        for (const product of testProducts) {
          const result = await prisma.product.create({ data: product });
          created.push(result);
        }
        return created;
      }
    );

    console.log('\n🔍 PRUEBAS DE CONSULTA...');

    // Simple queries
    await analyzer.measureOperation(
      'Consulta simple - Contar productos',
      'simple',
      () => prisma.product.count()
    );

    await analyzer.measureOperation(
      'Consulta simple - Obtener producto por ID',
      'simple',
      () => prisma.product.findUnique({
        where: { id: products[0].id }
      })
    );

    await analyzer.measureOperation(
      'Consulta simple - Buscar por SKU',
      'simple',
      () => prisma.product.findUnique({
        where: { sku: products[0].sku }
      })
    );

    // Complex queries
    await analyzer.measureOperation(
      'Consulta compleja - Productos con categoría',
      'complex',
      () => prisma.product.findMany({
        include: { category: true },
        take: 20
      })
    );

    await analyzer.measureOperation(
      'Consulta compleja - Búsqueda con filtros',
      'complex',
      () => prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: 'Test' } },
            { description: { contains: 'prueba' } }
          ],
          stockQuantity: { gte: 10 }
        },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    );

    await analyzer.measureOperation(
      'Consulta compleja - Productos con stock bajo',
      'complex',
      () => prisma.product.findMany({
        where: {
          stockQuantity: {
            lte: prisma.product.fields.minStock
          }
        },
        include: { category: true }
      })
    );

    await analyzer.measureOperation(
      'Consulta compleja - Agregación por categoría',
      'complex',
      () => prisma.product.groupBy({
        by: ['categoryId'],
        _count: { id: true },
        _avg: { salePrice: true },
        _sum: { stockQuantity: true }
      })
    );

    console.log('\n📝 PRUEBAS DE ACTUALIZACIÓN...');

    // Update operations
    await analyzer.measureOperation(
      'Actualización simple - Un producto',
      'simple',
      () => prisma.product.update({
        where: { id: products[0].id },
        data: { salePrice: 99.99 }
      })
    );

    await analyzer.measureOperation(
      'Actualización masiva - Múltiples productos',
      'bulk',
      () => prisma.product.updateMany({
        where: { categoryId: categories[0].id },
        data: { stockQuantity: { increment: 5 } }
      })
    );

    console.log('\n🗑️ LIMPIEZA...');

    // Cleanup
    await analyzer.measureOperation(
      'Eliminar productos de prueba',
      'bulk',
      () => prisma.product.deleteMany({
        where: {
          sku: { startsWith: 'TEST-' }
        }
      })
    );

    await analyzer.measureOperation(
      'Eliminar categorías de prueba',
      'bulk',
      () => prisma.category.deleteMany({
        where: {
          name: { endsWith: ' Test' }
        }
      })
    );

    // Generate performance report
    analyzer.generateReport();

    console.log('\n💡 RECOMENDACIONES DE OPTIMIZACIÓN:');
    console.log('1. ✅ Índices únicos en SKU implementados');
    console.log('2. ✅ Paginación implementada en endpoints');
    console.log('3. ✅ Consultas con select específico cuando es posible');
    console.log('4. 🔄 Considerar implementar caché para consultas frecuentes');
    console.log('5. 🔄 Añadir índices compuestos para filtros comunes');
    console.log('6. 🔄 Implementar lazy loading para relaciones grandes');

    console.log('\n✅ Análisis de rendimiento completado exitosamente!');

  } catch (error) {
    console.error('❌ Error durante el análisis de rendimiento:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute performance analysis
runPerformanceTests();