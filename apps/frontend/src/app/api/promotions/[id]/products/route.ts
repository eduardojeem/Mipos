import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isSupabaseActive } from '@/lib/env'
import { resolveOrganizationId } from '@/lib/organization'

// GET /api/promotions/:id/products
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await context.params

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, message: 'Supabase no está activo' }, { status: 503 })
    }

    const orgId = (await resolveOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get product IDs linked to this promotion
    const { data: links, error: linksError } = await supabase
      .from('promotions_products')
      .select('product_id')
      .eq('promotion_id', promotionId)
      .eq('organization_id', orgId)

    if (linksError) {
      console.error('[GET /promotions/:id/products] Links error:', linksError.message)
      return NextResponse.json({ success: false, message: 'Error al obtener productos' }, { status: 500 })
    }

    const productIds = (links || []).map((l: { product_id: string }) => String(l.product_id))

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, data: [], count: 0 })
    }

    // Get product details
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, sale_price, images, category_id, stock_quantity')
      .in('id', productIds)
      .eq('organization_id', orgId)

    if (productsError) {
      console.error('[GET /promotions/:id/products] Products error:', productsError.message)
      return NextResponse.json({ success: false, message: 'Error al obtener detalles de productos' }, { status: 500 })
    }

    // Get category names
    const categoryIds = Array.from(
      new Set((products || []).map((p: any) => p.category_id).filter(Boolean))
    )
    const categoryMap: Record<string, string> = {}
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds)
        .eq('organization_id', orgId)
      ;(cats || []).forEach((c: any) => { categoryMap[String(c.id)] = c.name })
    }

    const normalized = (products || []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      price: Number(p.sale_price || 0),
      imageUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      category: p.category_id ? categoryMap[String(p.category_id)] : null,
      categoryId: p.category_id ? String(p.category_id) : null,
      stock: Number(p.stock_quantity || 0),
    }))

    return NextResponse.json({ success: true, data: normalized, count: normalized.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[GET /promotions/:id/products] Unexpected:', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

// POST /api/promotions/:id/products
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await context.params

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, message: 'Supabase no está activo' }, { status: 503 })
    }

    const orgId = (await resolveOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const body = await request.json()
    const productIds: string[] = Array.isArray(body.productIds)
      ? body.productIds.map((id: unknown) => String(id))
      : []

    if (productIds.length === 0) {
      return NextResponse.json({ success: false, message: 'No se proporcionaron IDs de productos' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Verify promotion exists
    const { data: promo, error: promoError } = await supabase
      .from('promotions')
      .select('id')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single()

    if (promoError || !promo) {
      return NextResponse.json({ success: false, message: 'Promoción no encontrada' }, { status: 404 })
    }

    // Get existing to avoid duplicates
    const { data: existing } = await supabase
      .from('promotions_products')
      .select('product_id')
      .eq('promotion_id', promotionId)
      .eq('organization_id', orgId)

    const existingIds = new Set((existing || []).map((e: any) => String(e.product_id)))
    const newIds = productIds.filter((id) => !existingIds.has(id))

    if (newIds.length === 0) {
      return NextResponse.json({ success: true, message: 'Todos los productos ya están asociados', added: 0, skipped: productIds.length })
    }

    const { error: insertError } = await supabase
      .from('promotions_products')
      .insert(newIds.map((productId) => ({ promotion_id: promotionId, product_id: productId, organization_id: orgId })))

    if (insertError) {
      console.error('[POST /promotions/:id/products] Insert error:', insertError.message)
      return NextResponse.json({ success: false, message: 'Error al asociar productos' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${newIds.length} producto(s) asociado(s) exitosamente`,
      added: newIds.length,
      skipped: productIds.length - newIds.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[POST /promotions/:id/products] Unexpected:', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

// DELETE /api/promotions/:id/products?productId=xxx
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await context.params
    const productId = request.nextUrl.searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ success: false, message: 'Se requiere productId' }, { status: 400 })
    }

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, message: 'Supabase no está activo' }, { status: 503 })
    }

    const orgId = (await resolveOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('promotions_products')
      .delete()
      .eq('promotion_id', promotionId)
      .eq('product_id', productId)
      .eq('organization_id', orgId)

    if (error) {
      console.error('[DELETE /promotions/:id/products] Error:', error.message)
      return NextResponse.json({ success: false, message: 'Error al desasociar producto' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Producto desasociado exitosamente' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[DELETE /promotions/:id/products] Unexpected:', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
