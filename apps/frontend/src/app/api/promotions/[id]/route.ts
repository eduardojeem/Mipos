import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isSupabaseActive } from '@/lib/env'
import { resolveOrganizationId } from '@/lib/organization'

function toISODate(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((productId: unknown) => String(productId || '').trim())
        .filter((productId): productId is string => productId.length > 0)
    )
  )
}

async function getProductCount(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  promotionId: string,
  orgId: string
) {
  const { count } = await supabase
    .from('promotions_products')
    .select('product_id', { count: 'exact', head: true })
    .eq('promotion_id', promotionId)
    .eq('organization_id', orgId)

  return count ?? 0
}

// PATCH /api/promotions/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await params

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, message: 'Supabase no esta activo' }, { status: 503 })
    }

    const orgId = (await resolveOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const body = await request.json() as Record<string, unknown>
    const supabase = await createAdminClient()
    const requestedProductIds = body.applicableProductIds !== undefined
      ? normalizeProductIds(body.applicableProductIds)
      : null

    const { data: existingPromotion, error: existingError } = await supabase
      .from('promotions')
      .select('id')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single()

    if (existingError || !existingPromotion) {
      return NextResponse.json({ success: false, message: 'Promocion no encontrada' }, { status: 404 })
    }

    if (requestedProductIds !== null && requestedProductIds.length > 0) {
      const { data: validProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .in('id', requestedProductIds)

      if (productsError) {
        console.error('[PATCH /promotions/:id] Product validation error:', productsError.message)
        return NextResponse.json({ success: false, message: 'No se pudieron validar los productos seleccionados' }, { status: 500 })
      }

      const validProductIds = new Set(
        ((validProducts || []) as Array<{ id: string }>).map((product) => String(product.id))
      )

      if (validProductIds.size !== requestedProductIds.length) {
        const invalidProductIds = requestedProductIds.filter((id) => !validProductIds.has(id))
        return NextResponse.json({
          success: false,
          message: 'Algunos productos no existen, no estan activos o no pertenecen a la organizacion',
          invalidProductIds,
        }, { status: 400 })
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (body.name !== undefined) updatePayload.name = body.name
    if (body.description !== undefined) updatePayload.description = body.description
    if (body.discountType !== undefined) updatePayload.discount_type = body.discountType
    if (body.discountValue !== undefined) updatePayload.discount_value = Number(body.discountValue)
    if (body.startDate !== undefined) updatePayload.start_date = toISODate(body.startDate)
    if (body.endDate !== undefined) updatePayload.end_date = toISODate(body.endDate)
    if (body.isActive !== undefined) updatePayload.is_active = body.isActive
    if (body.minPurchaseAmount !== undefined) updatePayload.min_purchase_amount = Number(body.minPurchaseAmount) || 0
    if (body.maxDiscountAmount !== undefined) updatePayload.max_discount_amount = Number(body.maxDiscountAmount) || 0
    if (body.usageLimit !== undefined) updatePayload.usage_limit = Number(body.usageLimit) || 0

    if (Object.keys(updatePayload).length === 0 && requestedProductIds === null) {
      return NextResponse.json({ success: false, message: 'No hay cambios para guardar' }, { status: 400 })
    }

    let updatedPromotion: Record<string, unknown> | null = null

    if (Object.keys(updatePayload).length > 0) {
      const { data, error } = await supabase
        .from('promotions')
        .update(updatePayload)
        .eq('id', promotionId)
        .eq('organization_id', orgId)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[PATCH /promotions/:id] Update error:', error?.message)
        return NextResponse.json(
          { success: false, message: error?.message || 'Error al actualizar la promocion' },
          { status: 500 }
        )
      }

      updatedPromotion = data as Record<string, unknown>
    }

    if (requestedProductIds !== null) {
      const { data: currentLinks, error: currentLinksError } = await supabase
        .from('promotions_products')
        .select('product_id')
        .eq('promotion_id', promotionId)
        .eq('organization_id', orgId)

      if (currentLinksError) {
        console.error('[PATCH /promotions/:id] Current links error:', currentLinksError.message)
        return NextResponse.json({ success: false, message: 'Error al obtener productos asociados' }, { status: 500 })
      }

      const currentProductIds = new Set(
        ((currentLinks || []) as Array<{ product_id: string }>).map((link) => String(link.product_id))
      )
      const desiredProductIds = new Set(requestedProductIds)
      const idsToAdd = requestedProductIds.filter((id) => !currentProductIds.has(id))
      const idsToDelete = Array.from(currentProductIds).filter((id) => !desiredProductIds.has(id))

      if (idsToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('promotions_products')
          .insert(
            idsToAdd.map((productId) => ({
              promotion_id: promotionId,
              product_id: productId,
              organization_id: orgId,
            }))
          )

        if (addError) {
          console.error('[PATCH /promotions/:id] Add products error:', addError.message)
          return NextResponse.json({ success: false, message: 'Error al asociar productos a la promocion' }, { status: 500 })
        }
      }

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('promotions_products')
          .delete()
          .eq('promotion_id', promotionId)
          .eq('organization_id', orgId)
          .in('product_id', idsToDelete)

        if (deleteError) {
          console.error('[PATCH /promotions/:id] Remove products error:', deleteError.message)
          return NextResponse.json({ success: false, message: 'Error al sincronizar productos de la promocion' }, { status: 500 })
        }
      }
    }

    if (!updatedPromotion) {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', promotionId)
        .eq('organization_id', orgId)
        .single()

      if (error || !data) {
        return NextResponse.json({ success: false, message: 'Promocion no encontrada' }, { status: 404 })
      }

      updatedPromotion = data as Record<string, unknown>
    }

    const productCount = requestedProductIds !== null
      ? requestedProductIds.length
      : await getProductCount(supabase, promotionId, orgId)

    return NextResponse.json({
      success: true,
      data: { ...updatedPromotion, productCount },
      message: 'Promocion actualizada exitosamente',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[PATCH /promotions/:id] Unexpected:', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

// DELETE /api/promotions/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await params

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, message: 'Supabase no esta activo' }, { status: 503 })
    }

    const orgId = (await resolveOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: existingPromotion, error: existingError } = await supabase
      .from('promotions')
      .select('id')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single()

    if (existingError || !existingPromotion) {
      return NextResponse.json({ success: false, message: 'Promocion no encontrada' }, { status: 404 })
    }

    await supabase
      .from('promotions_products')
      .delete()
      .eq('promotion_id', promotionId)
      .eq('organization_id', orgId)

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promotionId)
      .eq('organization_id', orgId)

    if (error) {
      console.error('[DELETE /promotions/:id]', error.message)
      return NextResponse.json({ success: false, message: 'Error al eliminar la promocion' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Promocion eliminada exitosamente' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[DELETE /promotions/:id] Unexpected:', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

// GET /api/promotions/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await params

    if (['batch', 'carousel', 'offers-products'].includes(promotionId)) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, message: 'Supabase no esta activo' }, { status: 503 })
    }

    const orgId = (await resolveOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, message: 'Promocion no encontrada' }, { status: 404 })
    }

    const productCount = await getProductCount(supabase, promotionId, orgId)

    return NextResponse.json({ success: true, data: { ...data, productCount } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[GET /promotions/:id] Unexpected:', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
