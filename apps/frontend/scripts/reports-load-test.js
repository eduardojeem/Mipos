// Simple load test for /api/reports with concurrency
// Usage: node apps/frontend/scripts/reports-load-test.js

const { performance } = require('perf_hooks')
const os = require('os')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const CONCURRENCY = Number(process.env.CONCURRENCY || 10)
const ITERATIONS = Number(process.env.ITERATIONS || 3)
const TYPES = ['sales', 'inventory', 'customers', 'financial']

async function fetchReport(type) {
  const url = `${BASE_URL}/api/reports?type=${type}&start_date=2025-01-01&end_date=2025-01-31`
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
  return { type, ok, dur, size }
}

async function run() {
  console.log(`Load test: ${BASE_URL} | concurrency=${CONCURRENCY} | iterations=${ITERATIONS}`)
  console.log(`CPU: ${os.cpus().length} cores`)
  const results = []
  for (let i = 0; i < ITERATIONS; i++) {
    const batch = []
    for (let j = 0; j < CONCURRENCY; j++) {
      const type = TYPES[j % TYPES.length]
      batch.push(fetchReport(type))
    }
    const r = await Promise.all(batch)
    results.push(...r)
    const avg = r.reduce((s, x) => s + x.dur, 0) / r.length
    console.log(`Iteration ${i + 1}: avg=${avg.toFixed(1)}ms`) 
  }

  const byType = TYPES.map(t => {
    const filtered = results.filter(r => r.type === t)
    const avg = filtered.reduce((s, x) => s + x.dur, 0) / filtered.length
    const okRate = (filtered.filter(x => x.ok).length / filtered.length) * 100
    return { type: t, avgMs: avg.toFixed(1), okRate: `${okRate.toFixed(1)}%` }
  })
  console.table(byType)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})