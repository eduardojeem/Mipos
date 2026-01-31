import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseActive } from '@/lib/env'

// GET /api/promotions/:id/products - Get products associated with a promotion
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await context.params

    if (!isSupabaseActive()) {
      return NextResponse.json(
        { success: false, message: 'Supabase no está activo' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const orgId = (request.headers.get('x-organization-id') || '').trim()
    if (!orgId) return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })

    // Get promotion-product relationships
    const { data: links, error: linksError } = await (supabase as any)
      .from('promotions_products')
      .select('product_id')
      .eq('promotion_id', promotionId)
      .eq('organization_id', orgId)

    if (linksError) {
      return NextResponse.json(
        { success: false, message: 'Error al obtener productos' },
        { status: 500 }
      )
    }

    const productIds = Array.isArray(links) ? links.map((l: any) => String(l.product_id)) : []

    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      })
    }

    // Get product details
    const { data: products, error: productsError } = await (supabase as any)
      .from('products')
      .select('id, name, price, image_url, category_id, stock')
      .in('id', productIds)
      .eq('organization_id', orgId)

    if (productsError) {
      return NextResponse.json(
        { success: false, message: 'Error al obtener detalles de productos' },
        { status: 500 }
      )
    }

    // Get category names
    const categoryIds = Array.from(
      new Set(
        (products || [])
          .map((p: any) => p.category_id)
          .filter(Boolean)
      )
    )

    let categoryMap: Record<string, string> = {}
    if (categoryIds.length > 0) {
      const { data: categories } = await (supabase as any)
        .from('categories')
        .select('id, name')
        .in('id', categoryIds)
        .eq('organization_id', orgId)

      categoryMap = (categories || []).reduce((acc: any, cat: any) => {
        acc[String(cat.id)] = cat.name
        return acc
      }, {})
    }

    // Normalize product data
    const normalizedProducts = (products || []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      price: Number(p.price || 0),
      imageUrl: p.image_url,
      category: p.category_id ? categoryMap[String(p.category_id)] : null,
      categoryId: p.category_id ? String(p.category_id) : null,
      stock: Number(p.stock || 0)
    }))

    return NextResponse.json({
      success: true,
      data: normalizedProducts,
      count: normalizedProducts.length
    })
  } catch (error: any) {
    console.error('Error in GET /api/promotions/[id]/products:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/promotions/:id/products - Associate products with a promotion
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await context.params
    const body = await request.json()
    const productIds: string[] = Array.isArray(body.productIds) 
      ? body.productIds.map((id: any) => String(id))
      : []

    if (productIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No se proporcionaron IDs de productos' },
        { status: 400 }
      )
    }

    if (!isSupabaseActive()) {
      return NextResponse.json(
        { success: false, message: 'Supabase no está activo' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const orgId = (request.headers.get('x-organization-id') || '').trim()
    if (!orgId) return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })

    // Verify promotion exists
    const { data: promotion, error: promoError } = await (supabase as any)
      .from('promotions')
      .select('id')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single()

    if (promoError || !promotion) {
      return NextResponse.json(
        { success: false, message: 'Promoción no encontrada' },
        { status: 404 }
      )
    }

    // Get existing associations to avoid duplicates
    const { data: existing } = await (supabase as any)
      .from('promotions_products')
      .select('product_id')
      .eq('promotion_id', promotionId)
      .eq('organization_id', orgId)

    const existingIds = new Set(
      (existing || []).map((e: any) => String(e.product_id))
    )

    // Filter out already associated products
    const newProductIds = productIds.filter(id => !existingIds.has(id))

    if (newProductIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos los productos ya están asociados',
        added: 0,
        skipped: productIds.length
      })
    }

    // Insert new associations
    const rows = newProductIds.map(productId => ({
      promotion_id: promotionId,
      product_id: productId,
      organization_id: orgId
    }))

    const { error: insertError } = await (supabase as any)
      .from('promotions_products')
      .insert(rows)

    if (insertError) {
      return NextResponse.json(
        { success: false, message: 'Error al asociar productos' },
        { status: 500 }
      )
    }

    // Log audit
    const { data: userData } = await (supabase as any).auth.getUser()
    const userId = userData?.user?.id || 'system'
    
    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'promotion_products_added',
        resource: 'promotion',
        details: {
          promotion_id: promotionId,
          product_ids: newProductIds,
          count: newProductIds.length
        }
      })

    return NextResponse.json({
      success: true,
      message: `${newProductIds.length} producto(s) asociado(s) exitosamente`,
      added: newProductIds.length,
      skipped: productIds.length - newProductIds.length
    })
  } catch (error: any) {
    console.error('Error in POST /api/promotions/[id]/products:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/promotions/:id/products - Remove product associations
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await context.params
    const { searchParams } = request.nextUrl
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Se requiere productId' },
        { status: 400 }
      )
    }

    if (!isSupabaseActive()) {
      return NextResponse.json(
        { success: false, message: 'Supabase no está activo' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const orgId = (request.headers.get('x-organization-id') || '').trim()
    if (!orgId) return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })

    // Delete the association
    const { error: deleteError } = await (supabase as any)
      .from('promotions_products')
      .delete()
      .eq('promotion_id', promotionId)
      .eq('product_id', productId)
      .eq('organization_id', orgId)

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: 'Error al desasociar producto' },
        { status: 500 }
      )
    }

    // Log audit
    const { data: userData } = await (supabase as any).auth.getUser()
    const userId = userData?.user?.id || 'system'
    
    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'promotion_product_removed',
        resource: 'promotion',
        details: {
          promotion_id: promotionId,
          product_id: productId
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Producto desasociado exitosamente'
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/promotions/[id]/products:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
