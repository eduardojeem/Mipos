// Script para validar y ejecutar los índices de base de datos corregidos
const { execSync } = require('child_process');

// Leer el archivo de índices
const fs = require('fs');
const path = require('path');

const indexesFile = path.join(__dirname, '../src/config/database-indexes.sql');
const optimizationFile = path.join(__dirname, '../scripts/optimize-products-performance.sql');

console.log('🔍 Validando archivos de índices de base de datos...\n');

try {
  // Leer y mostrar el contenido del archivo de índices
  const indexesContent = fs.readFileSync(indexesFile, 'utf8');
  console.log('📋 Contenido del archivo database-indexes.sql:');
  console.log('=' .repeat(60));
  
  // Extraer solo las líneas CREATE INDEX para verificar
  const indexLines = indexesContent
    .split('\n')
    .filter(line => line.trim().startsWith('CREATE INDEX') || line.trim().startsWith('--'))
    .join('\n');
  
  console.log(indexLines);
  console.log('\n' + '=' .repeat(60));
  
  // Verificar que no haya referencias problemáticas
  const problematicPatterns = [
    'sales(created_at)',
    'inventory_movements(movement_type)',
    'is_active = true' // Eliminado el WHERE problemático
  ];
  
  let hasIssues = false;
  problematicPatterns.forEach(pattern => {
    if (indexesContent.includes(pattern)) {
      console.log(`⚠️  Advertencia: Se encontró el patrón problemático: ${pattern}`);
      hasIssues = true;
    }
  });
  
  if (!hasIssues) {
    console.log('✅ No se encontraron patrones problemáticos conocidos');
  }
  
  // Mostrar estadísticas
  const totalIndexes = (indexesContent.match(/CREATE INDEX/g) || []).length;
  const totalComments = (indexesContent.match(/^--/gm) || []).length;
  
  console.log(`\n📊 Estadísticas:`);
  console.log(`   - Total de índices: ${totalIndexes}`);
  console.log(`   - Total de comentarios: ${totalComments}`);
  
  // Verificar el archivo de optimización
  console.log('\n🔍 Validando archivo de optimización...');
  const optimizationContent = fs.readFileSync(optimizationFile, 'utf8');
  
  const optimizationIndexes = (optimizationContent.match(/CREATE INDEX/g) || []).length;
  console.log(`   - Índices adicionales en optimización: ${optimizationIndexes}`);
  
  // Verificar comandos ANALYZE
  const analyzeCommands = (optimizationContent.match(/ANALYZE/g) || []).length;
  console.log(`   - Comandos ANALYZE: ${analyzeCommands}`);
  
  console.log('\n✅ Validación completada exitosamente');
  
  console.log('\n💡 Recomendaciones para ejecutar:');
  console.log('   1. Conectar a la base de datos PostgreSQL');
  console.log('   2. Ejecutar: \\i ' + indexesFile.replace(/\\/g, '/'));
  console.log('   3. Ejecutar: \\i ' + optimizationFile.replace(/\\/g, '/'));
  console.log('   4. Verificar con: \\d tablename para cada tabla');
  
} catch (error) {
  console.error('❌ Error durante la validación:', error.message);
  process.exit(1);
}