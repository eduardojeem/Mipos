import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseActive } from '@/lib/env'
import { resolveOrganizationId } from '@/lib/organization'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, message: 'Supabase no está activo' }, { status: 503 })
    }

    const { id: sourcePromotionId } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const copyProducts = body.copyProducts !== undefined ? Boolean(body.copyProducts) : true

    if (!name) {
      return NextResponse.json({ success: false, message: 'Debes proporcionar un nombre' }, { status: 400 })
    }

    const orgId = ((await resolveOrganizationId(request)) || '').trim()
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
    }

    const { data: sourcePromotion, error: sourceError } = await supabase
      .from('promotions')
      .select('id,name,description,discount_type,discount_value,start_date,end_date,is_active,min_purchase_amount,max_discount_amount,usage_limit,organization_id')
      .eq('id', sourcePromotionId)
      .eq('organization_id', orgId)
      .single()

    if (sourceError || !sourcePromotion) {
      return NextResponse.json({ success: false, message: 'Promoción no encontrada' }, { status: 404 })
    }

    const { data: createdPromotion, error: createError } = await supabase
      .from('promotions')
      .insert({
        name,
        description: sourcePromotion.description,
        discount_type: sourcePromotion.discount_type,
        discount_value: sourcePromotion.discount_value,
        start_date: sourcePromotion.start_date,
        end_date: sourcePromotion.end_date,
        is_active: sourcePromotion.is_active,
        min_purchase_amount: sourcePromotion.min_purchase_amount ?? 0,
        max_discount_amount: sourcePromotion.max_discount_amount,
        usage_limit: sourcePromotion.usage_limit,
        organization_id: orgId,
      })
      .select('id')
      .single()

    if (createError || !createdPromotion) {
      return NextResponse.json({ success: false, message: createError?.message || 'No se pudo duplicar la promoción' }, { status: 500 })
    }

    let copiedProducts = 0
    if (copyProducts) {
      const { data: links, error: linksError } = await supabase
        .from('promotions_products')
        .select('product_id')
        .eq('promotion_id', sourcePromotionId)
        .eq('organization_id', orgId)

      if (linksError) {
        return NextResponse.json({ success: false, message: 'No se pudieron leer los productos asociados' }, { status: 500 })
      }

      const productIds = Array.from(
        new Set((links || []).map((l: { product_id: string }) => String(l.product_id)))
      )

      if (productIds.length > 0) {
        const rows = productIds.map((productId) => ({
          promotion_id: createdPromotion.id,
          product_id: productId,
          organization_id: orgId,
        }))

        const { error: insertLinksError } = await supabase
          .from('promotions_products')
          .insert(rows)

        if (insertLinksError) {
          return NextResponse.json({ success: false, message: 'No se pudieron copiar los productos asociados' }, { status: 500 })
        }

        copiedProducts = productIds.length
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: createdPromotion.id, copiedProducts },
      message: 'Promoción duplicada exitosamente',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

