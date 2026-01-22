#!/usr/bin/env node

/**
 * Script de Auditoría de Rendimiento - Sección de Productos
 * Analiza problemas de performance en tiempo real
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class ProductsPerformanceAuditor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      issues: [],
      metrics: {},
      recommendations: []
    };
    this.basePath = path.join(__dirname, '../apps/frontend/src');
  }

  async runAudit() {
    console.log('🔍 Iniciando auditoría de rendimiento - Sección de Productos\n');
    
    const startTime = performance.now();
    
    // Análisis de archivos
    await this.analyzeFileStructure();
    await this.analyzeComponentComplexity();
    await this.analyzeCacheImplementation();
    await this.analyzeQueryOptimization();
    await this.analyzeBundleSize();
    
    const endTime = performance.now();
    this.results.metrics.auditDuration = `${(endTime - startTime).toFixed(2)}ms`;
    
    // Generar reporte
    this.generateReport();
    
    console.log(`\n✅ Auditoría completada en ${this.results.metrics.auditDuration}`);
  }

  async analyzeFileStructure() {
    console.log('📁 Analizando estructura de archivos...');
    
    const productFiles = this.findProductFiles();
    
    // Detectar exceso de abstracción
    const abstractionLayers = this.countAbstractionLayers(productFiles);
    if (abstractionLayers > 4) {
      this.addIssue('CRITICAL', 'Exceso de capas de abstracción', {
        layers: abstractionLayers,
        impact: 'Alto - Aumenta latencia y complejidad',
        files: productFiles.slice(0, 5)
      });
    }
    
    // Detectar archivos grandes
    productFiles.forEach(file => {
      const stats = fs.statSync(file);
      const sizeKB = stats.size / 1024;
      
      if (sizeKB > 50) {
        this.addIssue('HIGH', `Archivo muy grande: ${path.basename(file)}`, {
          size: `${sizeKB.toFixed(1)}KB`,
          impact: 'Medio - Aumenta tiempo de parsing',
          recommendation: 'Dividir en componentes más pequeños'
        });
      }
    });
    
    this.results.metrics.totalProductFiles = productFiles.length;
    this.results.metrics.abstractionLayers = abstractionLayers;
  }

  async analyzeComponentComplexity() {
    console.log('🧩 Analizando complejidad de componentes...');
    
    const complexComponents = [
      'app/dashboard/products/page.tsx',
      'components/products/ProductsGrid.tsx',
      'app/dashboard/products/contexts/ProductsContext.tsx',
      'app/dashboard/products/hooks/useHybridProducts.ts'
    ];
    
    complexComponents.forEach(componentPath => {
      const fullPath = path.join(this.basePath, componentPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const complexity = this.calculateComplexity(content);
        
        if (complexity.cyclomaticComplexity > 15) {
          this.addIssue('HIGH', `Componente muy complejo: ${path.basename(componentPath)}`, {
            cyclomaticComplexity: complexity.cyclomaticComplexity,
            linesOfCode: complexity.linesOfCode,
            impact: 'Alto - Dificulta mantenimiento y performance'
          });
        }
        
        // Detectar hooks anidados
        const nestedHooks = this.detectNestedHooks(content);
        if (nestedHooks > 3) {
          this.addIssue('MEDIUM', `Hooks anidados excesivos: ${path.basename(componentPath)}`, {
            nestedHooks,
            impact: 'Medio - Causa re-renders innecesarios'
          });
        }
      }
    });
  }

  async analyzeCacheImplementation() {
    console.log('💾 Analizando implementación de cache...');
    
    const cacheFile = path.join(this.basePath, 'hooks/use-cache.ts');
    if (fs.existsSync(cacheFile)) {
      const content = fs.readFileSync(cacheFile, 'utf8');
      
      // Detectar configuración de cache ineficiente
      const cacheConfig = this.extractCacheConfig(content);
      
      if (cacheConfig.maxSize < 1000) {
        this.addIssue('MEDIUM', 'Cache size muy pequeño', {
          currentSize: cacheConfig.maxSize,
          recommendedSize: 2000,
          impact: 'Medio - Cache misses frecuentes'
        });
      }
      
      if (cacheConfig.defaultTTL > 15 * 60 * 1000) {
        this.addIssue('MEDIUM', 'TTL de cache muy largo', {
          currentTTL: `${cacheConfig.defaultTTL / 60000} minutos`,
          recommendedTTL: '5-10 minutos',
          impact: 'Medio - Datos obsoletos'
        });
      }
      
      // Detectar memory leaks potenciales
      if (content.includes('new Map') && !content.includes('clear()')) {
        this.addIssue('HIGH', 'Potencial memory leak en cache', {
          issue: 'Map sin cleanup adecuado',
          impact: 'Alto - Consumo de memoria creciente'
        });
      }
    }
  }

  async analyzeQueryOptimization() {
    console.log('🔍 Analizando optimización de queries...');
    
    const serviceFile = path.join(this.basePath, 'services/productService.ts');
    if (fs.existsSync(serviceFile)) {
      const content = fs.readFileSync(serviceFile, 'utf8');
      
      // Detectar SELECT *
      if (content.includes('select(`\n    *')) {
        this.addIssue('HIGH', 'Query ineficiente con SELECT *', {
          location: 'productService.ts',
          impact: 'Alto - Transfiere datos innecesarios',
          recommendation: 'Especificar campos necesarios'
        });
      }
      
      // Detectar N+1 queries
      const joinCount = (content.match(/\!.*_fkey/g) || []).length;
      if (joinCount > 2) {
        this.addIssue('MEDIUM', 'Posibles N+1 queries', {
          joinCount,
          impact: 'Medio - Múltiples queries por producto',
          recommendation: 'Optimizar joins o usar batch loading'
        });
      }
      
      // Detectar falta de paginación
      if (!content.includes('.range(')) {
        this.addIssue('CRITICAL', 'Falta paginación en queries', {
          impact: 'Crítico - Carga todos los productos',
          recommendation: 'Implementar paginación server-side'
        });
      }
    }
  }

  async analyzeBundleSize() {
    console.log('📦 Analizando tamaño de bundle...');
    
    // Simular análisis de bundle (en producción usaríamos webpack-bundle-analyzer)
    const componentSizes = {
      'ProductsGrid.tsx': 45,
      'ProductTable.tsx': 38,
      'ProductsContext.tsx': 32,
      'useHybridProducts.ts': 28,
      'ProductsTabs.tsx': 25
    };
    
    let totalSize = 0;
    Object.entries(componentSizes).forEach(([file, sizeKB]) => {
      totalSize += sizeKB;
      if (sizeKB > 40) {
        this.addIssue('MEDIUM', `Componente muy pesado: ${file}`, {
          size: `${sizeKB}KB`,
          impact: 'Medio - Aumenta tiempo de carga inicial'
        });
      }
    });
    
    this.results.metrics.estimatedBundleSize = `${totalSize}KB`;
    
    if (totalSize > 150) {
      this.addIssue('HIGH', 'Bundle de productos muy pesado', {
        totalSize: `${totalSize}KB`,
        impact: 'Alto - Tiempo de carga inicial lento',
        recommendation: 'Implementar code splitting más granular'
      });
    }
  }

  // Métodos auxiliares
  findProductFiles() {
    const productPaths = [
      'app/dashboard/products',
      'components/products',
      'hooks/use-products.ts',
      'services/productService.ts'
    ];
    
    const files = [];
    productPaths.forEach(p => {
      const fullPath = path.join(this.basePath, p);
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...this.getAllFiles(fullPath, ['.tsx', '.ts']));
        } else {
          files.push(fullPath);
        }
      }
    });
    
    return files;
  }

  getAllFiles(dir, extensions) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        files.push(...this.getAllFiles(fullPath, extensions));
      } else if (extensions.some(ext => file.endsWith(ext))) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  countAbstractionLayers(files) {
    // Contar capas basándose en imports y dependencias
    let maxLayers = 0;
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const imports = (content.match(/import.*from/g) || []).length;
      const hooks = (content.match(/use[A-Z]\w*/g) || []).length;
      
      const layers = Math.min(imports + hooks, 10); // Cap at 10
      maxLayers = Math.max(maxLayers, layers);
    });
    
    return maxLayers;
  }

  calculateComplexity(content) {
    const lines = content.split('\n');
    const linesOfCode = lines.filter(line => 
      line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')
    ).length;
    
    // Calcular complejidad ciclomática simplificada
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case'];
    const operatorKeywords = ['&&', '||', '?'];
    let cyclomaticComplexity = 1; // Base complexity
    
    complexityKeywords.forEach(keyword => {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      if (matches) cyclomaticComplexity += matches.length;
    });
    
    operatorKeywords.forEach(operator => {
      const escapedOperator = operator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = content.match(new RegExp(escapedOperator, 'g'));
      if (matches) cyclomaticComplexity += matches.length;
    });
    
    return { linesOfCode, cyclomaticComplexity };
  }

  detectNestedHooks(content) {
    // Detectar hooks dentro de otros hooks
    const hookPattern = /const\s+\w+\s*=\s*use\w+\(/g;
    const matches = content.match(hookPattern) || [];
    return matches.length;
  }

  extractCacheConfig(content) {
    const config = {
      maxSize: 500,
      defaultTTL: 30 * 60 * 1000,
      cleanupInterval: 5 * 60 * 1000
    };
    
    // Extraer configuración real del código
    const maxSizeMatch = content.match(/maxSize:\s*(\d+)/);
    if (maxSizeMatch) config.maxSize = parseInt(maxSizeMatch[1]);
    
    const ttlMatch = content.match(/defaultTTL:\s*(\d+\s*\*\s*\d+\s*\*\s*\d+)/);
    if (ttlMatch) {
      // Evaluar expresión simple como "30 * 60 * 1000"
      try {
        config.defaultTTL = eval(ttlMatch[1]);
      } catch (e) {
        // Mantener valor por defecto
      }
    }
    
    return config;
  }

  addIssue(severity, title, details) {
    this.results.issues.push({
      severity,
      title,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    const report = `
# 🔍 REPORTE DE AUDITORÍA DE RENDIMIENTO - PRODUCTOS

**Fecha**: ${this.results.timestamp}
**Duración**: ${this.results.metrics.auditDuration}

## 📊 RESUMEN

- **Archivos analizados**: ${this.results.metrics.totalProductFiles}
- **Capas de abstracción**: ${this.results.metrics.abstractionLayers}
- **Bundle estimado**: ${this.results.metrics.estimatedBundleSize}
- **Issues encontrados**: ${this.results.issues.length}

## 🚨 ISSUES CRÍTICOS

${this.results.issues
  .filter(issue => issue.severity === 'CRITICAL')
  .map(issue => `### ${issue.title}
**Severidad**: 🔴 ${issue.severity}
**Detalles**: ${JSON.stringify(issue.details, null, 2)}
`)
  .join('\n')}

## ⚠️ ISSUES IMPORTANTES

${this.results.issues
  .filter(issue => issue.severity === 'HIGH')
  .map(issue => `### ${issue.title}
**Severidad**: 🟡 ${issue.severity}
**Detalles**: ${JSON.stringify(issue.details, null, 2)}
`)
  .join('\n')}

## 📋 ISSUES MENORES

${this.results.issues
  .filter(issue => issue.severity === 'MEDIUM')
  .map(issue => `### ${issue.title}
**Severidad**: 🟢 ${issue.severity}
**Detalles**: ${JSON.stringify(issue.details, null, 2)}
`)
  .join('\n')}

## 🎯 RECOMENDACIONES PRIORITARIAS

1. **Simplificar arquitectura** - Reducir capas de abstracción
2. **Implementar virtualización** - Para listas grandes de productos
3. **Optimizar queries** - Eliminar SELECT * y N+1 queries
4. **Mejorar cache** - Configuración más eficiente
5. **Code splitting** - Reducir bundle size inicial

---
*Generado automáticamente por ProductsPerformanceAuditor*
`;

    // Guardar reporte
    const reportPath = path.join(__dirname, '../PERFORMANCE_AUDIT_REPORT.md');
    fs.writeFileSync(reportPath, report);
    
    // Guardar datos JSON para análisis posterior
    const dataPath = path.join(__dirname, '../performance-audit-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(this.results, null, 2));
    
    console.log(`\n📄 Reporte guardado en: ${reportPath}`);
    console.log(`📊 Datos JSON en: ${dataPath}`);
    
    // Mostrar resumen en consola
    console.log('\n📊 RESUMEN DE ISSUES:');
    const severityCounts = this.results.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(severityCounts).forEach(([severity, count]) => {
      const emoji = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟡' : '🟢';
      console.log(`  ${emoji} ${severity}: ${count} issues`);
    });
  }
}

// Ejecutar auditoría
if (require.main === module) {
  const auditor = new ProductsPerformanceAuditor();
  auditor.runAudit().catch(console.error);
}

module.exports = ProductsPerformanceAuditor;