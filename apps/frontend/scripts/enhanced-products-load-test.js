// Enhanced load test for /api/products with more comprehensive scenarios
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10');
const ITERATIONS = parseInt(process.env.ITERATIONS || '5');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3006';

console.log(`Enhanced load test: ${BASE_URL} | concurrency=${CONCURRENCY} | iterations=${ITERATIONS}`);
console.log(`CPU: ${require('os').cpus().length} cores`);

const scenarios = [
  // Basic listing scenarios
  { name: 'basic_list', query: 'page=1&limit=25&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  { name: 'basic_list_page2', query: 'page=2&limit=25&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  { name: 'large_list', query: 'page=1&limit=100&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  
  // Search scenarios
  { name: 'search_by_name', query: 'page=1&limit=25&search=lipstick&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  { name: 'search_by_sku', query: 'page=1&limit=25&search=SKU001&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  
  // Filter scenarios
  { name: 'filter_by_category', query: 'page=1&limit=25&categoryId=cat1&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  { name: 'filter_by_price_range', query: 'page=1&limit=25&minPrice=10&maxPrice=50&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  { name: 'filter_by_stock_status', query: 'page=1&limit=25&stockStatus=in-stock&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  
  // Delta sync scenarios
  { name: 'delta_sync', query: 'since=2024-01-01T00:00:00Z&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  
  // Complex scenarios
  { name: 'complex_search', query: 'page=1&limit=25&search=face&categoryId=cat1&minPrice=20&maxPrice=100&stockStatus=in-stock&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  
  // Sort scenarios
  { name: 'sort_by_price_asc', query: 'page=1&limit=25&sortBy=price&sortOrder=asc&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  { name: 'sort_by_price_desc', query: 'page=1&limit=25&sortBy=price&sortOrder=desc&fields=id,sku,name,salePrice,stockQuantity,updatedAt' },
  { name: 'sort_by_name', query: 'page=1&limit=25&sortBy=name&sortOrder=asc&fields=id,sku,name,salePrice,stockQuantity,updatedAt' }
];

async function fetchProducts(query, scenarioName) {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/products?${query}`, {
      headers: {
        'Authorization': 'Bearer test-token', // Simular autenticación
        'Content-Type': 'application/json'
      }
    });
    
    const duration = Date.now() - start;
    const size = response.headers.get('content-length') || '0';
    const ok = response.ok;
    
    if (response.ok) {
      const data = await response.json();
      const resultCount = Array.isArray(data.products) ? data.products.length : 0;
      return { duration, size, ok, resultCount, scenario: scenarioName };
    } else {
      return { duration, size, ok: false, resultCount: 0, scenario: scenarioName, error: response.status };
    }
  } catch (error) {
    const duration = Date.now() - start;
    return { duration, size: '0', ok: false, resultCount: 0, scenario: scenarioName, error: error.message };
  }
}

async function runConcurrentTest(scenario) {
  const promises = Array(CONCURRENCY).fill().map(() => fetchProducts(scenario.query, scenario.name));
  const results = await Promise.all(promises);
  
  const durations = results.map(r => r.duration);
  const sizes = results.map(r => parseInt(r.size));
  const successes = results.filter(r => r.ok).length;
  
  return {
    scenario: scenario.name,
    avgMs: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    p95Ms: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
    avgSize: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
    okRate: `${((successes / CONCURRENCY) * 100).toFixed(1)}%`,
    avgResults: Math.round(results.map(r => r.resultCount).reduce((a, b) => a + b, 0) / results.length)
  };
}

async function run() {
  console.log('\n🚀 Iniciando pruebas de rendimiento mejoradas...\n');
  
  const allResults = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    console.log(`\n📊 Iteración ${i + 1}/${ITERATIONS}:`);
    
    for (const scenario of scenarios) {
      const result = await runConcurrentTest(scenario);
      allResults.push(result);
      console.log(`  ${scenario.name}: ${result.avgMs}ms (p95: ${result.p95Ms}ms) | ${result.okRate} éxito | ${result.avgResults} resultados | ${result.avgSize} bytes`);
    }
    
    // Pequeña pausa entre iteraciones
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumen final
  console.log('\n📈 RESUMEN DE RENDIMIENTO:');
  console.log('='.repeat(80));
  
  const summary = {};
  allResults.forEach(result => {
    if (!summary[result.scenario]) {
      summary[result.scenario] = [];
    }
    summary[result.scenario].push(result);
  });
  
  Object.keys(summary).forEach(scenario => {
    const results = summary[scenario];
    const avgMs = results.reduce((a, b) => a + parseFloat(b.avgMs), 0) / results.length;
    const avgP95 = results.reduce((a, b) => a + b.p95Ms, 0) / results.length;
    const avgOkRate = results.reduce((a, b) => a + parseFloat(b.okRate), 0) / results.length;
    
    console.log(`${scenario.padEnd(25)}: ${avgMs.toFixed(1)}ms avg | ${avgP95.toFixed(1)}ms p95 | ${avgOkRate.toFixed(1)}% éxito`);
  });
  
  console.log('\n🎯 Métricas clave:');
  const allAvgMs = allResults.map(r => parseFloat(r.avgMs));
  const allP95 = allResults.map(r => r.p95Ms);
  
  console.log(`⏱️  Tiempo promedio general: ${(allAvgMs.reduce((a, b) => a + b, 0) / allAvgMs.length).toFixed(1)}ms`);
  console.log(`⚡ Percentil 95 general: ${(allP95.reduce((a, b) => a + b, 0) / allP95.length).toFixed(1)}ms`);
  console.log(`🐌 Consulta más lenta: ${Math.max(...allAvgMs).toFixed(1)}ms`);
  console.log(`🚀 Consulta más rápida: ${Math.min(...allAvgMs).toFixed(1)}ms`);
  
  // Identificar cuellos de botella
  console.log('\n⚠️  Posibles cuellos de botella:');
  const slowQueries = allResults.filter(r => parseFloat(r.avgMs) > 500);
  if (slowQueries.length > 0) {
    console.log(`   - ${slowQueries.length} consultas superan los 500ms`);
    slowQueries.forEach(q => console.log(`     * ${q.scenario}: ${q.avgMs}ms`));
  } else {
    console.log('   ✨ Todas las consultas están por debajo de 500ms');
  }
  
  console.log('\n✅ Pruebas completadas exitosamente');
}

run().catch(console.error);