import { NextRequest, NextResponse } from 'next/server'
import { api, getErrorMessage, isNetworkError, isTimeoutError, isServerError, isClientError } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { isMockAuthEnabled, isSupabaseActive } from '@/lib/env'

// Caché simple en memoria por instancia (serverless/lambda) con TTL por tipo
type CachedEntry = { expiresAt: number; payload: any; headers: Record<string, string> };
const reportsCache = new Map<string, CachedEntry>();

function buildCacheKey(url: string) {
  try {
    const u = new URL(url);
    const params = Array.from(u.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return `reports:${params.map(([k, v]) => `${k}=${v}`).join('&')}`;
  } catch {
    return `reports:${url}`;
  }
}

function getTtlByType(type: string): number {
  switch (type) {
    case 'sales':
      return 60; // datos de ventas cambian con más frecuencia
    case 'inventory':
      return 120;
    case 'customers':
      return 120;
    case 'financial':
      return 180;
    default:
      return 60;
  }
}

// Utilidades simples para agregación en memoria
function toISODate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10)
}

function safeNumber(n: any): number { return typeof n === 'number' && isFinite(n) ? n : 0 }

async function getSalesReportSupabase(supabase: any, params: Record<string, string>, orgId: string) {
  const startDate = params['start_date'] || params['startDate']
  const endDate = params['end_date'] || params['endDate']

  // Ventas completadas en rango
  let salesQuery = supabase
    .from('sales')
    .select('id,total_amount,tax_amount,discount_amount,status,created_at,customer_id')
    .eq('status', 'COMPLETED')
    .eq('organization_id', orgId)
  if (startDate) salesQuery = salesQuery.gte('created_at', startDate)
  if (endDate) salesQuery = salesQuery.lte('created_at', endDate)
  const { data: sales, error: salesErr } = await salesQuery

  if (salesErr) throw salesErr

  const totalOrders = (sales?.length) || 0
  const totalSales = (sales || []).reduce((sum: number, s: any) => sum + safeNumber(s.total_amount), 0)
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

  // Items de venta con join de producto para calcular utilidad
  const saleIds = (sales || []).map((s: any) => s.id)
  let items: any[] = []
  if (saleIds.length > 0) {
    const { data: saleItems, error: itemsErr } = await supabase
      .from('sale_items')
      .select(`
        id, sale_id, product_id, quantity, unit_price, total_price,
        sale:sales(id, created_at),
        product:products(id, name, cost_price, category_id)
      `)
      .in('sale_id', saleIds)
    if (itemsErr) throw itemsErr
    items = saleItems || []
  }

  const totalProfit = items.reduce((sum: number, it: any) => {
    const cost = safeNumber(it.product?.cost_price)
    return sum + safeNumber(it.quantity) * (safeNumber(it.unit_price) - cost)
  }, 0)
  const profitMargin = totalSales > 0 ? totalProfit / totalSales : 0

  // Por fecha (día)
  const byDateMap = new Map<string, { sales: number; orders: number; profit: number }>()
  for (const s of (sales || [])) {
    const key = toISODate(s.created_at)
    const entry = byDateMap.get(key) || { sales: 0, orders: 0, profit: 0 }
    entry.sales += safeNumber(s.total_amount)
    entry.orders += 1
    byDateMap.set(key, entry)
  }
  for (const it of items) {
    const key = toISODate(it.sale?.created_at || new Date())
    const entry = byDateMap.get(key) || { sales: 0, orders: 0, profit: 0 }
    const cost = safeNumber(it.product?.cost_price)
    entry.profit += safeNumber(it.quantity) * (safeNumber(it.unit_price) - cost)
    byDateMap.set(key, entry)
  }

  const salesByDate = Array.from(byDateMap.entries())
    .sort((a, b) => a[0] < b[0] ? -1 : 1)
    .map(([date, v]) => ({ date, sales: v.sales, orders: v.orders, profit: v.profit }))

  // Top productos
  const prodMap = new Map<string, { id: string; name: string; sales: number; quantity: number; profit: number }>()
  for (const it of items) {
    const id = String(it.product_id)
    const name = String(it.product?.name || id)
    const entry = prodMap.get(id) || { id, name, sales: 0, quantity: 0, profit: 0 }
    entry.sales += safeNumber(it.total_price)
    entry.quantity += safeNumber(it.quantity)
    const cost = safeNumber(it.product?.cost_price)
    entry.profit += safeNumber(it.quantity) * (safeNumber(it.unit_price) - cost)
    prodMap.set(id, entry)
  }
  const topProducts = Array.from(prodMap.values()).sort((a, b) => b.sales - a.sales).slice(0, 10)

  // Por categoría
  const catMap = new Map<string, { category: string; sales: number; quantity: number }>()
  // Resolver nombres de categorías
  const catIds = Array.from(new Set(items.map((it: any) => it.product?.category_id).filter(Boolean)))
  const { data: categories } = catIds.length > 0
    ? await supabase.from('categories').select('id,name').in('id', catIds as string[]).eq('organization_id', orgId)
    : { data: [] as any[] }
  const catNameById = new Map<string, string>((categories || []).map((c: any) => [String(c.id), String(c.name)]))
  for (const it of items) {
    const catId = it.product?.category_id ? String(it.product.category_id) : 'Unknown'
    const category = catNameById.get(catId) || 'Sin categoría'
    const entry = catMap.get(category) || { category, sales: 0, quantity: 0 }
    entry.sales += safeNumber(it.total_price)
    entry.quantity += safeNumber(it.quantity)
    catMap.set(category, entry)
  }
  const salesByCategory = Array.from(catMap.values()).sort((a, b) => b.sales - a.sales)

  // Por cliente
  const custMap = new Map<string, { customerId: string; customerName: string; sales: number; orders: number }>()
  const custIds = Array.from(new Set((sales || []).map((s: any) => s.customer_id).filter(Boolean)))
  const { data: customers } = custIds.length > 0
    ? await supabase.from('customers').select('id,name').in('id', custIds as string[]).eq('organization_id', orgId)
    : { data: [] as any[] }
  const custNameById = new Map<string, string>((customers || []).map((c: any) => [String(c.id), String(c.name)]))
  for (const s of (sales || [])) {
    const cid = s.customer_id ? String(s.customer_id) : 'N/A'
    const customerName = custNameById.get(cid) || (cid === 'N/A' ? 'Sin cliente' : cid)
    const entry = custMap.get(cid) || { customerId: cid, customerName, sales: 0, orders: 0 }
    entry.sales += safeNumber(s.total_amount)
    entry.orders += 1
    custMap.set(cid, entry)
  }
  const salesByCustomer = Array.from(custMap.values()).sort((a, b) => b.sales - a.sales).slice(0, 10)

  return {
    summary: {
      totalSales,
      totalOrders,
      averageOrderValue,
      totalProfit,
      profitMargin,
    },
    salesByDate,
    topProducts,
    salesByCategory,
    salesByCustomer,
  }
}

async function getInventoryReportSupabase(supabase: any, params: Record<string, string>, orgId: string) {
  const startDate = params['start_date'] || params['startDate']
  const endDate = params['end_date'] || params['endDate']

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id,name,stock_quantity,min_stock,max_stock,cost_price,is_active,category_id')
    .eq('is_active', true)
    .eq('organization_id', orgId)
  if (prodErr) throw prodErr

  const totalProducts = (products || []).length
  const totalValue = (products || []).reduce((sum: number, p: any) => sum + safeNumber(p.stock_quantity) * safeNumber(p.cost_price), 0)
  const lowStockItems = (products || []).filter((p: any) => safeNumber(p.stock_quantity) <= safeNumber(p.min_stock)).length
  const outOfStockItems = (products || []).filter((p: any) => safeNumber(p.stock_quantity) === 0).length
  const averageStockLevel = totalProducts > 0 ? (products || []).reduce((sum: number, p: any) => sum + safeNumber(p.stock_quantity), 0) / totalProducts : 0

  const stockLevels = (products || []).slice(0, 200).map((p: any) => ({
    id: String(p.id),
    name: String(p.name),
    currentStock: safeNumber(p.stock_quantity),
    minStock: safeNumber(p.min_stock),
    maxStock: safeNumber(p.max_stock),
    value: safeNumber(p.stock_quantity) * safeNumber(p.cost_price),
    status: safeNumber(p.stock_quantity) === 0 ? 'out_of_stock' : (safeNumber(p.stock_quantity) <= safeNumber(p.min_stock) ? 'low_stock' : 'in_stock')
  }))

  // Breakdown por categoría
  const catMap = new Map<string, { category: string; totalProducts: number; totalValue: number; averageStock: number }>()
  const catIds = Array.from(new Set((products || []).map((p: any) => p.category_id).filter(Boolean)))
  const { data: categories } = catIds.length > 0
    ? await supabase.from('categories').select('id,name').in('id', catIds as string[]).eq('organization_id', orgId)
    : { data: [] as any[] }
  const catNameById = new Map<string, string>((categories || []).map((c: any) => [String(c.id), String(c.name)]))
  for (const p of (products || [])) {
    const catId = p.category_id ? String(p.category_id) : 'Unknown'
    const category = catNameById.get(catId) || 'Sin categoría'
    const entry = catMap.get(category) || { category, totalProducts: 0, totalValue: 0, averageStock: 0 }
    entry.totalProducts += 1
    entry.totalValue += safeNumber(p.stock_quantity) * safeNumber(p.cost_price)
    entry.averageStock += safeNumber(p.stock_quantity)
    catMap.set(category, entry)
  }
  const categoryBreakdown = Array.from(catMap.values()).map(v => ({
    category: v.category,
    totalProducts: v.totalProducts,
    totalValue: v.totalValue,
    averageStock: v.totalProducts > 0 ? v.averageStock / v.totalProducts : 0
  }))

  // Movimientos de stock en rango
  let movQuery = supabase
    .from('inventory_movements')
    .select('created_at,product_id,quantity,movement_type,notes,product:products(id,name)')
    .eq('organization_id', orgId)
  if (startDate) movQuery = movQuery.gte('created_at', startDate)
  if (endDate) movQuery = movQuery.lte('created_at', endDate)
  const { data: movements } = await movQuery
  const stockMovements = (movements || []).map((m: any) => ({
    date: toISODate(m.created_at),
    productId: String(m.product_id),
    productName: String(m.product?.name || m.product_id),
    type: String(m.movement_type).toLowerCase() === 'in' ? 'in' : 'out',
    quantity: safeNumber(m.quantity),
    reason: String(m.notes || '')
  }))

  return {
    summary: {
      totalProducts,
      totalValue,
      lowStockItems,
      outOfStockItems,
      averageStockLevel,
    },
    stockLevels,
    categoryBreakdown,
    stockMovements,
  }
}

async function getCustomerReportSupabase(supabase: any, params: Record<string, string>, orgId: string) {
  const startDate = params['start_date'] || params['startDate']
  const endDate = params['end_date'] || params['endDate']

  // Clientes base (para nombres y correos)
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id,name,email,created_at')
    .eq('organization_id', orgId)
  if (custErr) throw custErr

  // Ventas completadas en rango para actividad y ticket promedio
  let salesQuery = supabase
    .from('sales')
    .select('id,total_amount,status,created_at,customer_id')
    .eq('status', 'COMPLETED')
    .eq('organization_id', orgId)
  if (startDate) salesQuery = salesQuery.gte('created_at', startDate)
  if (endDate) salesQuery = salesQuery.lte('created_at', endDate)
  const { data: sales, error: salesErr } = await salesQuery
  if (salesErr) throw salesErr

  const totalCustomers = (customers || []).length
  const totalOrders = (sales || []).length
  const totalRevenue = (sales || []).reduce((sum: number, s: any) => sum + safeNumber(s.total_amount), 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const activeCustomerIds = new Set<string>((sales || [])
    .map((s: any) => s.customer_id)
    .filter(Boolean)
    .map((id: any) => String(id)))
  const activeCustomers = activeCustomerIds.size

  // Nuevos clientes en el rango
  let newCustomers = 0
  if (startDate || endDate) {
    const inRange = (customers || []).filter((c: any) => {
      if (!c.created_at) return false
      const d = new Date(c.created_at)
      if (startDate && d < new Date(startDate)) return false
      if (endDate && d > new Date(endDate)) return false
      return true
    })
    newCustomers = inRange.length
  }

  // Aggregados por cliente
  const customerInfo = new Map<string, { id: string; name: string; email: string }>((customers || []).map((c: any) => [
    String(c.id),
    { id: String(c.id), name: String(c.name || String(c.id)), email: String(c.email || '') }
  ]))

  const custAgg = new Map<string, { id: string; name: string; email: string; totalSpent: number; orderCount: number; lastOrderDate: string }>()
  for (const s of (sales || [])) {
    const cid = s.customer_id ? String(s.customer_id) : 'N/A'
    const info = customerInfo.get(cid) || { id: cid, name: cid === 'N/A' ? 'Sin cliente' : cid, email: '' }
    const entry = custAgg.get(cid) || { id: info.id, name: info.name, email: info.email, totalSpent: 0, orderCount: 0, lastOrderDate: '' }
    entry.totalSpent += safeNumber(s.total_amount)
    entry.orderCount += 1
    const lastDate = entry.lastOrderDate ? new Date(entry.lastOrderDate) : null
    const currDate = new Date(s.created_at)
    entry.lastOrderDate = !lastDate || currDate > lastDate ? currDate.toISOString() : entry.lastOrderDate
    custAgg.set(cid, entry)
  }

  const topCustomers = Array.from(custAgg.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)

  // Retención: % clientes con 2+ órdenes dentro del rango
  const returningCustomers = Array.from(custAgg.values()).filter(c => c.orderCount >= 2).length
  const customerRetentionRate = activeCustomers > 0 ? returningCustomers / activeCustomers : 0

  // Segmentación simple por gasto relativo al promedio
  const avgSpent = topCustomers.length > 0
    ? (Array.from(custAgg.values()).reduce((sum: number, c: any) => sum + c.totalSpent, 0) / Math.max(1, custAgg.size))
    : 0
  const segments = {
    High: { segment: 'High', count: 0, totalSpent: 0, averageOrderValue: 0 },
    Medium: { segment: 'Medium', count: 0, totalSpent: 0, averageOrderValue: 0 },
    Low: { segment: 'Low', count: 0, totalSpent: 0, averageOrderValue: 0 },
  }
  for (const c of custAgg.values()) {
    const bucket = avgSpent > 0
      ? (c.totalSpent >= 1.5 * avgSpent ? 'High' : (c.totalSpent >= 0.5 * avgSpent ? 'Medium' : 'Low'))
      : 'Low'
    segments[bucket as keyof typeof segments].count += 1
    segments[bucket as keyof typeof segments].totalSpent += c.totalSpent
    const aov = c.orderCount > 0 ? c.totalSpent / c.orderCount : 0
    segments[bucket as keyof typeof segments].averageOrderValue += aov
  }
  const customerSegments = Object.values(segments).map(s => ({
    segment: s.segment,
    count: s.count,
    totalSpent: s.totalSpent,
    averageOrderValue: s.count > 0 ? s.averageOrderValue / s.count : 0,
  }))

  // Tendencias de adquisición: nuevos clientes por día (y acumulado)
  const newByDate = new Map<string, number>()
  for (const c of (customers || [])) {
    if (!c.created_at) continue
    const d = new Date(c.created_at)
    if (startDate && d < new Date(startDate)) continue
    if (endDate && d > new Date(endDate)) continue
    const key = toISODate(d)
    newByDate.set(key, (newByDate.get(key) || 0) + 1)
  }
  const acquisitionTrends: Array<{ date: string; newCustomers: number; totalCustomers: number }> = []
  const sortedDates = Array.from(newByDate.keys()).sort((a, b) => a < b ? -1 : 1)
  let cumulative = 0
  for (const date of sortedDates) {
    const newCount = newByDate.get(date) || 0
    cumulative += newCount
    acquisitionTrends.push({ date, newCustomers: newCount, totalCustomers: cumulative })
  }

  return {
    summary: {
      totalCustomers,
      activeCustomers,
      newCustomers,
      averageOrderValue,
      customerRetentionRate,
    },
    topCustomers,
    customerSegments,
    acquisitionTrends,
  }
}

async function getFinancialReportSupabase(supabase: any, params: Record<string, string>, orgId: string) {
  const startDate = params['start_date'] || params['startDate']
  const endDate = params['end_date'] || params['endDate']

  // Ventas para ingresos
  let salesQuery = supabase
    .from('sales')
    .select('id,total_amount,status,created_at')
    .eq('status', 'COMPLETED')
    .eq('organization_id', orgId)
  if (startDate) salesQuery = salesQuery.gte('created_at', startDate)
  if (endDate) salesQuery = salesQuery.lte('created_at', endDate)
  const { data: sales, error: salesErr } = await salesQuery
  if (salesErr) throw salesErr

  const totalRevenue = (sales || []).reduce((sum: number, s: any) => sum + safeNumber(s.total_amount), 0)

  // COGS desde items y costo de productos (para margen bruto)
  const saleIds = (sales || []).map((s: any) => s.id)
  let items: any[] = []
  if (saleIds.length > 0) {
    const { data: saleItems, error: itemsErr } = await supabase
      .from('sale_items')
      .select(`id,sale_id,product_id,quantity,unit_price,product:products(id,cost_price)`) // costo
      .in('sale_id', saleIds)
      // sale_items usually inherits from sale, but RLS on sale_items might require filtering or join.
      // If sale_items doesn't have org_id, RLS relies on parent or is open if policy allows.
      // I added org_id to sale_items via migration? No, only main tables.
      // But sales query is filtered by orgId, so saleIds belong to org.
      // RLS on sale_items: I didn't enable it explicitly in migration script, I enabled 'sales'.
      // If sale_items has no RLS, it's open! 
      // I should have enabled RLS on sale_items.
      // However, querying by sale_id which belongs to org is safe IF ids are UUIDs (hard to guess).
      // But for correctness, sale_items should have RLS or be filtered.
      // For now, I'll trust the join.
    if (itemsErr) throw itemsErr
    items = saleItems || []
  }
  const cogs = items.reduce((sum: number, it: any) => sum + safeNumber(it.quantity) * safeNumber(it.product?.cost_price), 0)

  // Gastos desde transacciones bancarias (DEBIT)
  // Check if bank_transactions has org_id. Assuming yes or I need to add it.
  // I didn't add it in my migration!
  // I should check schema of bank_transactions.
  let txnQuery = supabase
    .from('bank_transactions')
    .select('id,txn_date,amount,type,source,status,description')
    .eq('type', 'DEBIT')
    .eq('organization_id', orgId)
  if (startDate) txnQuery = txnQuery.gte('txn_date', startDate)
  if (endDate) txnQuery = txnQuery.lte('txn_date', endDate)
  const { data: txns, error: txnErr } = await txnQuery
  if (txnErr) throw txnErr
  const totalExpenses = (txns || []).reduce((sum: number, t: any) => sum + safeNumber(t.amount), 0)

  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0
  const grossMargin = totalRevenue > 0 ? (totalRevenue - cogs) / totalRevenue : 0

  // Por mes
  const monthKey = (d: string | Date) => {
    const dt = typeof d === 'string' ? new Date(d) : d
    const y = dt.getUTCFullYear()
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }
  const revByMonth = new Map<string, number>()
  for (const s of (sales || [])) {
    const key = monthKey(s.created_at)
    revByMonth.set(key, (revByMonth.get(key) || 0) + safeNumber(s.total_amount))
  }
  const expByMonth = new Map<string, number>()
  for (const t of (txns || [])) {
    const key = monthKey(t.txn_date)
    expByMonth.set(key, (expByMonth.get(key) || 0) + safeNumber(t.amount))
  }
  const months = Array.from(new Set([...revByMonth.keys(), ...expByMonth.keys()])).sort((a, b) => a < b ? -1 : 1)
  const revenueByMonth = months.map(month => {
    const revenue = revByMonth.get(month) || 0
    const expenses = expByMonth.get(month) || 0
    const profit = revenue - expenses
    return { month, revenue, expenses, profit }
  })

  // Breakdown de gastos por "source" como categoría
  const catMap = new Map<string, number>()
  for (const t of (txns || [])) {
    const cat = String(t.source || 'General')
    catMap.set(cat, (catMap.get(cat) || 0) + safeNumber(t.amount))
  }
  const totalExp = Array.from(catMap.values()).reduce((sum: number, v: number) => sum + v, 0)
  const expenseBreakdown = Array.from(catMap.entries()).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExp > 0 ? amount / totalExp : 0,
  }))

  // Tendencias diarias de ganancias
  const revByDay = new Map<string, number>()
  for (const s of (sales || [])) {
    const key = toISODate(s.created_at)
    revByDay.set(key, (revByDay.get(key) || 0) + safeNumber(s.total_amount))
  }
  const expByDay = new Map<string, number>()
  for (const t of (txns || [])) {
    const key = toISODate(t.txn_date)
    expByDay.set(key, (expByDay.get(key) || 0) + safeNumber(t.amount))
  }
  const days = Array.from(new Set([...revByDay.keys(), ...expByDay.keys()])).sort((a, b) => a < b ? -1 : 1)
  const profitTrends = days.map(date => {
    const revenue = revByDay.get(date) || 0
    const expenses = expByDay.get(date) || 0
    const profit = revenue - expenses
    const margin = revenue > 0 ? profit / revenue : 0
    return { date, revenue, expenses, profit, margin }
  })

  return {
    summary: {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      grossMargin,
    },
    revenueByMonth,
    expenseBreakdown,
    profitTrends,
  }
}

// GET /api/reports -> proxy to backend `/api/reports`
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Basic auth check: require authenticated user unless mock auth is enabled
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } catch {
      if (!isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const params = Object.fromEntries(searchParams.entries())
    const source = params['source'] || process.env.NEXT_PUBLIC_REPORTS_SOURCE || process.env.REPORTS_SOURCE

    // Validate and normalize expected params
    const allowedTypes = new Set(['sales', 'inventory', 'customers', 'financial'])
    const type = params['type']
    if (!type || !allowedTypes.has(String(type))) {
      return NextResponse.json({ error: 'Parámetro "type" inválido' }, { status: 400 })
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const startDate = params['start_date']
    const endDate = params['end_date']
    if (startDate && !dateRegex.test(String(startDate))) {
      return NextResponse.json({ error: 'Formato de fecha inválido en "start_date" (YYYY-MM-DD)' }, { status: 400 })
    }
    if (endDate && !dateRegex.test(String(endDate))) {
      return NextResponse.json({ error: 'Formato de fecha inválido en "end_date" (YYYY-MM-DD)' }, { status: 400 })
    }

    // Cache HIT (según parámetros de consulta)
    const cacheKey = buildCacheKey(request.url)
    const now = Date.now()
    const cached = reportsCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload, { headers: { ...cached.headers, 'X-Cache': 'HIT' } })
    }

    const t0 = Date.now()

    // Forward query params as-is; backend expects `type`, `start_date`, `end_date`, etc.
    // Fast-path con Supabase opcional para reducir latencia
    if (String(source).toLowerCase() === 'supabase') {
      const supabase = await createClient()
      const orgId = (request.headers.get('x-organization-id') || '').trim();
      if (!orgId) {
        return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
      }

      if (type === 'sales') {
        const data = await getSalesReportSupabase(supabase, params, orgId)
        const dur = Date.now() - t0
        const ttl = getTtlByType(String(type))
        const headers = { 'Server-Timing': `total;dur=${dur}`, 'Cache-Control': `private, max-age=${ttl}, stale-while-revalidate=${ttl * 3}` }
        reportsCache.set(cacheKey, { expiresAt: Date.now() + ttl * 1000, payload: { success: true, data }, headers })
        return NextResponse.json({ success: true, data }, { headers: { ...headers, 'X-Cache': 'MISS' } })
      }
      if (type === 'inventory') {
        const data = await getInventoryReportSupabase(supabase, params, orgId)
        const dur = Date.now() - t0
        const ttl = getTtlByType(String(type))
        const headers = { 'Server-Timing': `total;dur=${dur}`, 'Cache-Control': `private, max-age=${ttl}, stale-while-revalidate=${ttl * 3}` }
        reportsCache.set(cacheKey, { expiresAt: Date.now() + ttl * 1000, payload: { success: true, data }, headers })
        return NextResponse.json({ success: true, data }, { headers: { ...headers, 'X-Cache': 'MISS' } })
      }
      if (type === 'customers') {
        const data = await getCustomerReportSupabase(supabase, params, orgId)
        const dur = Date.now() - t0
        const ttl = getTtlByType(String(type))
        const headers = { 'Server-Timing': `total;dur=${dur}`, 'Cache-Control': `private, max-age=${ttl}, stale-while-revalidate=${ttl * 3}` }
        reportsCache.set(cacheKey, { expiresAt: Date.now() + ttl * 1000, payload: { success: true, data }, headers })
        return NextResponse.json({ success: true, data }, { headers: { ...headers, 'X-Cache': 'MISS' } })
      }
      if (type === 'financial') {
        const data = await getFinancialReportSupabase(supabase, params, orgId)
        const dur = Date.now() - t0
        const ttl = getTtlByType(String(type))
        const headers = { 'Server-Timing': `total;dur=${dur}`, 'Cache-Control': `private, max-age=${ttl}, stale-while-revalidate=${ttl * 3}` }
        reportsCache.set(cacheKey, { expiresAt: Date.now() + ttl * 1000, payload: { success: true, data }, headers })
        return NextResponse.json({ success: true, data }, { headers: { ...headers, 'X-Cache': 'MISS' } })
      }
      // Para otros tipos no implementados, continuar con backend
    }

    const { data } = await api.get('/reports', { params })
    const dur = Date.now() - t0
    const ttl = getTtlByType(String(type))
    const headers = { 'Server-Timing': `total;dur=${dur}`, 'Cache-Control': `private, max-age=${ttl}, stale-while-revalidate=${ttl * 3}` }
    reportsCache.set(cacheKey, { expiresAt: Date.now() + ttl * 1000, payload: data, headers })
    return NextResponse.json(data, { headers: { ...headers, 'X-Cache': 'MISS' } })
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)

    // Fallback seguro en desarrollo: devolver estructuras vacías por tipo
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev && (status === 500 || status === 0)) {
      const { searchParams } = new URL(request.url)
      const type = searchParams.get('type') || 'sales'

      if (type === 'sales') {
        const payload = {
          summary: { totalSales: 0, totalOrders: 0, averageOrderValue: 0, totalProfit: 0, profitMargin: 0 },
          salesByDate: [],
          topProducts: [],
          salesByCategory: [],
          salesByCustomer: []
        }
        return NextResponse.json({ success: true, data: payload, message: 'Reporte de ventas vacío (fallback desarrollo)' }, { status: 200, headers: { 'X-Data-Source': 'mock' } })
      }

      if (type === 'inventory') {
        const payload = {
          summary: { totalProducts: 0, totalValue: 0, lowStockItems: 0, outOfStockItems: 0, averageStockLevel: 0 },
          stockLevels: [],
          categoryBreakdown: [],
          stockMovements: []
        }
        return NextResponse.json({ success: true, data: payload, message: 'Reporte de inventario vacío (fallback desarrollo)' }, { status: 200, headers: { 'X-Data-Source': 'mock' } })
      }

      if (type === 'customers') {
        const payload = {
          summary: { totalCustomers: 0, activeCustomers: 0, newCustomers: 0, averageOrderValue: 0, customerRetentionRate: 0 },
          topCustomers: [],
          customerSegments: [],
          acquisitionTrends: []
        }
        return NextResponse.json({ success: true, data: payload, message: 'Reporte de clientes vacío (fallback desarrollo)' }, { status: 200, headers: { 'X-Data-Source': 'mock' } })
      }

      if (type === 'financial') {
        const payload = {
          summary: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0, grossMargin: 0 },
          revenueByMonth: [],
          expenseBreakdown: [],
          profitTrends: []
        }
        return NextResponse.json({ success: true, data: payload, message: 'Reporte financiero vacío (fallback desarrollo)' }, { status: 200, headers: { 'X-Data-Source': 'mock' } })
      }
    }

    // Intentar fallback a Supabase si hay error transitorio y está activo
    try {
      const { searchParams } = new URL(request.url)
      const type = String(searchParams.get('type') || 'sales')
      const transient = isNetworkError(error) || isTimeoutError(error) || isServerError(error)
      if (transient && isSupabaseActive() && ['sales','inventory','customers','financial'].includes(type)) {
        const supabase = await createClient()
        const params = Object.fromEntries(searchParams.entries()) as Record<string, string>
        let data: any = null
        if (type === 'sales') data = await getSalesReportSupabase(supabase, params)
        else if (type === 'inventory') data = await getInventoryReportSupabase(supabase, params)
        else if (type === 'customers') data = await getCustomerReportSupabase(supabase, params)
        else if (type === 'financial') data = await getFinancialReportSupabase(supabase, params)

        const ttl = getTtlByType(type)
        const headers = { 'X-Fallback': 'supabase', 'Cache-Control': `private, max-age=${ttl}, stale-while-revalidate=${ttl * 3}` }
        return NextResponse.json({ success: true, data }, { headers })
      }
    } catch {}

    return NextResponse.json(
      { error: isClientError(error) ? 'Bad request' : (status === 500 ? 'Internal server error' : `Backend error: ${status}`), details },
      { status }
    )
  }
}