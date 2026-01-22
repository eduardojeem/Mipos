import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const admin = createAdminClient()

    const { data: existingCategory } = await admin
      .from('categories')
      .select('id')
      .eq('name', 'Test Category')
      .maybeSingle()

    let categoryId = existingCategory?.id
    if (!categoryId) {
      const { data: newCategory, error: catErr } = await admin
        .from('categories')
        .insert([{ name: 'Test Category', description: 'Categoria de prueba' }])
        .select('id')
        .single()
      if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 })
      categoryId = newCategory.id
    }

    const products = [
      { name: 'Test Product A', sku: 'TESTA001' },
      { name: 'Test Product B', sku: 'TEST_002' },
      { name: 'Test Product C', sku: 'TEST-003' },
    ]

    const created: any[] = []
    for (const p of products) {
      const { data: exists } = await admin
        .from('products')
        .select('id, sku')
        .eq('sku', p.sku)
        .maybeSingle()
      if (exists) continue
      const { data, error } = await admin
        .from('products')
        .insert([{ 
          name: p.name,
          sku: p.sku,
          description: 'Producto de prueba',
          category_id: categoryId,
          cost_price: 10.00,
          sale_price: 20.00,
          stock_quantity: 50,
          min_stock: 5,
          images: []
        }])
        .select('id, name, sku')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      created.push(data)
    }

    return NextResponse.json({ ok: true, createdCount: created.length, created })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
