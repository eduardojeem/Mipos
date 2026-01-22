import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const admin = createAdminClient()

    const { data: anyUser } = await admin.from('users').select('id, role').limit(1).single()
    let userId = anyUser?.id as string | undefined
    if (!userId) {
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
      const u = (data as any)?.users?.[0]
      if (!u?.id) return NextResponse.json({ error: 'No hay usuarios disponibles' }, { status: 400 })
      userId = u.id
    }

    const ensure = async (table: string, unique: Record<string, any>, values: Record<string, any>) => {
      const sel = Object.entries(unique).map(([k, v]) => `${k}.eq.${v}`).join(',')
      const { data: existing } = await admin.from(table).select('id').or(sel).maybeSingle()
      if (existing?.id) return existing.id
      const { data, error } = await admin.from(table).insert([values]).select('id').single()
      if (error) throw new Error(error.message)
      return data.id
    }

    const catElect = await ensure('categories', { name: 'Electrónica' }, { name: 'Electrónica', description: 'Dispositivos y gadgets' })
    const catAcc = await ensure('categories', { name: 'Accesorios' }, { name: 'Accesorios', description: 'Accesorios y complementos' })

    const supMain = await ensure('suppliers', { name: 'Proveedor Principal' }, { name: 'Proveedor Principal', contact_info: { email: 'proveedor@empresa.com', phone: '+1 555 1010' } })

    const custJohn = await ensure('customers', { email: 'john@example.com' }, { name: 'John Doe', email: 'john@example.com', phone: '+1 555 2020' })
    const custJane = await ensure('customers', { email: 'jane@example.com' }, { name: 'Jane Smith', email: 'jane@example.com', phone: '+1 555 3030' })

    const p1 = await ensure('products', { sku: 'PHONE_001' }, { name: 'Smartphone Pro', sku: 'PHONE_001', description: 'Teléfono inteligente', category_id: catElect, cost_price: 300, sale_price: 499, stock_quantity: 25, min_stock: 2, images: [] })
    const p2 = await ensure('products', { sku: 'HEADSET-002' }, { name: 'Headset Inalámbrico', sku: 'HEADSET-002', description: 'Auriculares BT', category_id: catAcc, cost_price: 40, sale_price: 79, stock_quantity: 60, min_stock: 5, images: [] })
    const p3 = await ensure('products', { sku: 'CHARGER_003' }, { name: 'Cargador Rápido', sku: 'CHARGER_003', description: 'Cargador USB-C', category_id: catAcc, cost_price: 12, sale_price: 25, stock_quantity: 150, min_stock: 10, images: [] })

    const saleSubtotal = 499 + 79
    const saleTax = Math.round(saleSubtotal * 0.1 * 100) / 100
    const saleTotal = saleSubtotal + saleTax

    const { data: saleExists } = await admin.from('sales').select('id').eq('customer_id', custJohn).limit(1).maybeSingle()
    let saleId = saleExists?.id as string | undefined
    if (!saleId) {
      const { data: sale, error: saleErr } = await admin
        .from('sales')
        .insert([{ user_id: userId, customer_id: custJohn, subtotal: saleSubtotal, discount: 0, tax: saleTax, total: saleTotal, payment_method: 'CASH', notes: 'Venta de ejemplo' }])
        .select('id')
        .single()
      if (saleErr) throw new Error(saleErr.message)
      saleId = sale.id
    }

    const addItem = async (sku: string, qty: number, unit: number) => {
      const { data: prod } = await admin.from('products').select('id').eq('sku', sku).single()
      if (!prod?.id) throw new Error(`Producto con SKU ${sku} no encontrado`)
      const { data: exists } = await admin.from('sale_items').select('id').eq('sale_id', saleId!).eq('product_id', prod.id).maybeSingle()
      if (exists?.id) return exists.id
      const { data, error } = await admin.from('sale_items').insert([{ sale_id: saleId, product_id: prod.id, quantity: qty, unit_price: unit }]).select('id').single()
      if (error) throw new Error(error.message)
      return data.id
    }

    await addItem('PHONE_001', 1, 499)
    await addItem('HEADSET-002', 1, 79)

    const ensureMovement = async (productSku: string, qty: number, type: 'IN' | 'OUT') => {
      const { data: prod } = await admin.from('products').select('id').eq('sku', productSku).single()
      if (!prod?.id) throw new Error(`Producto con SKU ${productSku} no encontrado`)
      const { data: exists } = await admin
        .from('inventory_movements')
        .select('id')
        .eq('product_id', prod.id)
        .eq('movement_type', type)
        .eq('quantity', qty)
        .maybeSingle()
      if (exists?.id) return exists.id
      const { data, error } = await admin
        .from('inventory_movements')
        .insert([{ product_id: prod.id, movement_type: type, quantity: qty, reference_type: 'PURCHASE', user_id: userId }])
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return data.id
    }

    await ensureMovement('PHONE_001', 10, 'IN')
    await ensureMovement('HEADSET-002', 20, 'IN')

    return NextResponse.json({ ok: true, userId, categories: [catElect, catAcc], products: [p1, p2, p3], saleId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
