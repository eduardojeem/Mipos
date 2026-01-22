// Load test for /api/products (dashboard-related queries)
// Usage: node apps/frontend/scripts/products-load-test.js

const { performance } = require('perf_hooks')
const os = require('os')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const CONCURRENCY = Number(process.env.CONCURRENCY || 10)
const ITERATIONS = Number(process.env.ITERATIONS || 3)

const paramsList = [
  'page=1&limit=25&sortBy=updated_at&sortOrder=desc&fields=id,sku,name,salePrice,stockQuantity,minStock,categoryId,updatedAt',
  'page=1&limit=25&search=lip&fields=id,sku,name,salePrice,stockQuantity,updatedAt',
  'page=2&limit=25&categoryId=cat1&fields=id,sku,name,salePrice,stockQuantity,updatedAt',
  'page=1&limit=25&minPrice=10&maxPrice=50&fields=id,sku,name,salePrice,updatedAt',
]

async function fetchProducts(params) {
  const url = `${BASE_URL}/api/products?${params}`
  const t0 = performance.now()
  const res = await fetch(url)
  const t1 = performance.now()
  const dur = t1 - t0
  const ok = res.ok
  let size = 0
  try {
    const json = await res.json()
    size = JSON.stringify(json).length
  } catch {}
  return { params, ok, dur, size }
}

async function run() {
  console.log(`Load test: ${BASE_URL} | concurrency=${CONCURRENCY} | iterations=${ITERATIONS}`)
  console.log(`CPU: ${os.cpus().length} cores`)
  const results = []
  for (let i = 0; i < ITERATIONS; i++) {
    const batch = []
    for (let j = 0; j < CONCURRENCY; j++) {
      const params = paramsList[j % paramsList.length]
      batch.push(fetchProducts(params))
    }
    const r = await Promise.all(batch)
    results.push(...r)
    const avg = r.reduce((s, x) => s + x.dur, 0) / r.length
    const avgSize = r.reduce((s, x) => s + x.size, 0) / r.length
    console.log(`Iteration ${i + 1}: avg=${avg.toFixed(1)}ms size=${avgSize.toFixed(0)} bytes`) 
  }

  const summary = paramsList.map(p => {
    const filtered = results.filter(r => r.params === p)
    const avg = filtered.reduce((s, x) => s + x.dur, 0) / filtered.length
    const avgSize = filtered.reduce((s, x) => s + x.size, 0) / filtered.length
    const okRate = (filtered.filter(x => x.ok).length / filtered.length) * 100
    return { query: p.slice(0, 60) + (p.length > 60 ? '...' : ''), avgMs: avg.toFixed(1), avgSize: Math.round(avgSize), okRate: `${okRate.toFixed(1)}%` }
  })
  console.table(summary)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})