import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

function arg(key: string, def?: string) {
  const idx = process.argv.findIndex(a => a.startsWith(`--${key}`))
  if (idx >= 0) {
    const valPart = process.argv[idx].split('=')[1]
    if (valPart) return valPart
    if (process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) return process.argv[idx + 1]
  }
  return def
}

// Accept both flag-based and positional args
let targetEmail = String(arg('email', '')).trim()
let rateStr = String(arg('rate', '7500')).trim()
const posArgs = process.argv.filter(a => !a.startsWith('--'))
// posArgs format: [node, script, maybeEmail, maybeRate]
if (!targetEmail && posArgs[2]) targetEmail = String(posArgs[2]).trim()
if (rateStr === '7500' && posArgs[3]) rateStr = String(posArgs[3]).trim()
const FX_RATE = Math.max(1, Number(rateStr) || 7500)

if (!targetEmail) {
  console.error('❌ Debes pasar el email: npm run seed:pyg -- --email usuario@example.com [--rate 7500]')
  process.exit(1)
}

async function findUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) throw error
  return (data?.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase()) || null
}

async function getUserOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return (data as any)?.organization_id || null
}

async function ensureStoreCurrency(orgId: string) {
  // Prefiere business_config por organización
  try {
    const { data: existing } = await supabase
      .from('business_config')
      .select('id, currency, organization_id')
      .eq('organization_id', orgId)
      .limit(1)
      .maybeSingle()
    if (existing) {
      await supabase
        .from('business_config')
        .update({ currency: 'PYG', tax_rate: 10, timezone: 'America/Asuncion', language: 'es' })
        .eq('id', (existing as any).id)
    } else {
      await supabase
        .from('business_config')
        .insert({ organization_id: orgId, business_name: 'Electrónica Demo', currency: 'PYG', tax_rate: 10, timezone: 'America/Asuncion', language: 'es' })
    }
    console.log('✅ Moneda de tienda configurada a PYG (business_config)')
    return
  } catch (e) {
    // fallback: store_settings global
    try {
      await supabase.from('store_settings').update({ currency: 'PYG' })
      console.log('ℹ️ Fallback: store_settings actualizado a PYG (global)')
    } catch {
      console.warn('⚠️ No se pudo actualizar currency en business_config/store_settings')
    }
  }
}

async function upsertCategory(name: string, description: string, organization_id: string) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id, name')
    .eq('name', name)
    .eq('organization_id', organization_id)
    .limit(1)
    .maybeSingle()
  if (existing) return existing as any
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, description, is_active: true, organization_id })
    .select('id, name')
    .single()
  if (error) throw error
  return data as any
}

async function upsertSupplier(payload: any) {
  const { data: existing } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('name', payload.name)
    .eq('organization_id', payload.organization_id)
    .limit(1)
    .maybeSingle()
  if (existing) return existing as any
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...payload, is_active: true })
    .select('id, name')
    .single()
  if (error) throw error
  return data as any
}

async function insertProducts(orgId: string, categories: Record<string, { id: string }>) {
  const prods = [
    { name: 'Smartphone 5G', sku: 'TEL-5G-001', cat: 'Electrónica', sale: 1500000, cost: 1200000, stock: 40, min: 5 },
    { name: 'Laptop Gamer RTX', sku: 'LAP-RTX-015', cat: 'Electrónica', sale: 4500000, cost: 3600000, stock: 12, min: 2 },
    { name: 'Auriculares Bluetooth', sku: 'AUD-BT-090', cat: 'Accesorios', sale: 150000, cost: 100000, stock: 80, min: 10 },
    { name: 'Monitor 27" 144Hz', sku: 'MON-27-144', cat: 'Electrónica', sale: 2200000, cost: 1800000, stock: 15, min: 2 },
    { name: 'Mouse Gamer RGB', sku: 'MOU-RGB-220', cat: 'Accesorios', sale: 120000, cost: 80000, stock: 100, min: 10 },
    { name: 'Teclado Mecánico', sku: 'TEC-MEC-330', cat: 'Accesorios', sale: 350000, cost: 250000, stock: 60, min: 5 }
  ]
  let created = 0
  for (const p of prods) {
    const cat = categories[p.cat]
    if (!cat?.id) continue
    const { data: existing } = await supabase
      .from('products')
      .select('id, sku')
      .eq('sku', p.sku)
      .eq('organization_id', orgId)
      .limit(1)
      .maybeSingle()
    if (existing) {
      // actualizar precios y stock
      await supabase
        .from('products')
        .update({ sale_price: p.sale, cost_price: p.cost, stock_quantity: p.stock, min_stock: p.min, category_id: cat.id })
        .eq('id', (existing as any).id)
      continue
    }
    const { error } = await supabase
      .from('products')
      .insert({
        name: p.name,
        sku: p.sku,
        category_id: cat.id,
        description: `${p.name} - demo` ,
        sale_price: p.sale,
        cost_price: p.cost,
        stock_quantity: p.stock,
        min_stock: p.min,
        is_active: true,
        organization_id: orgId
      })
    if (!error) created++
  }
  console.log(`✅ Productos creados/actualizados: ${created} (pyg)`) 
}

async function convertExistingPricesToPYG(orgId: string) {
  const { data: products } = await supabase
    .from('products')
    .select('id, sale_price, cost_price')
    .eq('organization_id', orgId)
  const list = Array.isArray(products) ? products : []
  let updated = 0
  for (const p of list) {
    const sale = Number((p as any).sale_price || 0)
    const cost = Number((p as any).cost_price || 0)
    const isFractional = sale % 1 !== 0 || cost % 1 !== 0
    const isSuspiciouslyLow = sale > 0 && sale < 10000
    if (isFractional || isSuspiciouslyLow) {
      const newSale = Math.round(sale * FX_RATE)
      const newCost = Math.round(cost * FX_RATE)
      await supabase
        .from('products')
        .update({ sale_price: newSale, cost_price: newCost })
        .eq('id', (p as any).id)
      updated++
    }
  }
  console.log(`🔄 Productos convertidos a PYG (tasa ${FX_RATE}): ${updated}`)
}

async function createCashData(userId: string, orgId: string) {
  const now = new Date()
  const { data: session, error } = await supabase
    .from('cash_sessions')
    .insert({
      opened_by: userId,
      opening_amount: 1500000,
      status: 'OPEN',
      opening_time: now.toISOString(),
      notes: 'Sesión demo electrónica',
      organization_id: orgId
    })
    .select()
    .single()
  if (error) {
    console.warn('⚠️ No se pudo crear sesión de caja:', error.message)
    return
  }
  const sessionId = (session as any).id
  await supabase.from('cash_movements').insert([
    { session_id: sessionId, type: 'IN', amount: 500000, reason: 'Venta demo', reference_type: 'SALE', created_by: userId },
    { session_id: sessionId, type: 'OUT', amount: 100000, reason: 'Compra insumos', reference_type: 'PURCHASE', created_by: userId }
  ])
  console.log(`💵 Sesión de caja creada: ${sessionId} con movimientos demo`)
}

async function main() {
  console.log(`🚀 Sembrando datos PYG para: ${targetEmail} (tasa FX=${FX_RATE})`)
  const user = await findUserByEmail(targetEmail)
  if (!user) {
    console.error('❌ Usuario no encontrado. Asegúrate de que existe en Supabase.')
    process.exit(1)
  }
  const orgId = await getUserOrgId(user.id)
  if (!orgId) {
    console.error('❌ El usuario no tiene organización asignada. Asigna uno antes de continuar.')
    process.exit(1)
  }
  await ensureStoreCurrency(orgId)

  // Categorías y proveedores
  const catElectronica = await upsertCategory('Electrónica', 'Dispositivos y gadgets', orgId)
  const catAccesorios = await upsertCategory('Accesorios', 'Periféricos y complementos', orgId)
  const categories: Record<string, { id: string }> = {
    'Electrónica': { id: (catElectronica as any).id },
    'Accesorios': { id: (catAccesorios as any).id }
  }

  await upsertSupplier({ name: 'ElectroSupply S.A.', email: 'ventas@electrosupply.com', phone: '0981 123 456', address: 'Av. Principal 123, Asunción', organization_id: orgId })
  await upsertSupplier({ name: 'Insumos Tech PY', email: 'contacto@techpy.com', phone: '0972 555 777', address: 'Cdad. del Este', organization_id: orgId })

  await insertProducts(orgId, categories)
  await convertExistingPricesToPYG(orgId)
  await createCashData(user.id, orgId)

  console.log('✨ Datos demo PYG creados/actualizados exitosamente')
}

main().catch((e) => {
  console.error('❌ Error inesperado:', e?.message || e)
  process.exit(1)
})
