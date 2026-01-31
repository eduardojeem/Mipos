import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseActive } from '@/lib/env'
import { logAudit } from '@/app/api/admin/_utils/audit'

// PATCH /api/promotions/:id - Update promotion
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await params
    const body = await request.json()

    if (!isSupabaseActive()) {
      return NextResponse.json(
        { success: false, message: 'Supabase no está activo' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const orgId = (request.headers.get('x-organization-id') || '').trim()
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    // Verify promotion exists
    const { data: existing, error: existError } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single()

    if (existError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Promoción no encontrada' },
        { status: 404 }
      )
    }

    // Prepare update payload
    const updatePayload: Record<string, unknown> = {}
    
    if (body.name !== undefined) updatePayload.name = body.name
    if (body.description !== undefined) updatePayload.description = body.description
    if (body.discountType !== undefined) updatePayload.discount_type = body.discountType
    if (body.discountValue !== undefined) updatePayload.discount_value = body.discountValue
    if (body.startDate !== undefined) updatePayload.start_date = body.startDate
    if (body.endDate !== undefined) updatePayload.end_date = body.endDate
    if (body.isActive !== undefined) updatePayload.is_active = body.isActive
    if (body.minPurchaseAmount !== undefined) updatePayload.min_purchase_amount = body.minPurchaseAmount
    if (body.maxDiscountAmount !== undefined) updatePayload.max_discount_amount = body.maxDiscountAmount
    if (body.usageLimit !== undefined) updatePayload.usage_limit = body.usageLimit

    // Update promotion
    const { data, error } = await supabase
      .from('promotions')
      .update(updatePayload)
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Error al actualizar la promoción' },
        { status: 500 }
      )
    }

    // Log audit
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || 'system'
    
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'promotion_updated',
        resource: 'promotion',
        details: {
          promotion_id: promotionId,
          old_data: existing,
          new_data: data,
          changes: updatePayload
        }
      })

    logAudit('promotions.update', {
      entityType: 'PROMOTION',
      entityId: promotionId,
      oldData: existing,
      newData: data
    })

    return NextResponse.json({
      success: true,
      data,
      message: 'Promoción actualizada exitosamente'
    })
  } catch (error: unknown) {
    console.error('Error in PATCH /api/promotions/[id]:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}

// DELETE /api/promotions/:id - Delete promotion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await params

    if (!isSupabaseActive()) {
      return NextResponse.json(
        { success: false, message: 'Supabase no está activo' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const orgId = (request.headers.get('x-organization-id') || '').trim()
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    // Verify promotion exists
    const { data: existing, error: existError } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single()

    if (existError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Promoción no encontrada' },
        { status: 404 }
      )
    }

    // Delete promotion-product relationships first
    await supabase
      .from('promotions_products')
      .delete()
      .eq('promotion_id', promotionId)
      .eq('organization_id', orgId)

    // Delete promotion
    const { error: deleteError } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promotionId)
      .eq('organization_id', orgId)

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: 'Error al eliminar la promoción' },
        { status: 500 }
      )
    }

    // Log audit
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || 'system'
    
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'promotion_deleted',
        resource: 'promotion',
        details: {
          promotion_id: promotionId,
          deleted_data: existing
        }
      })

    logAudit('promotions.delete', {
      entityType: 'PROMOTION',
      entityId: promotionId,
      oldData: existing
    })

    return NextResponse.json({
      success: true,
      message: 'Promoción eliminada exitosamente'
    })
  } catch (error: unknown) {
    console.error('Error in DELETE /api/promotions/[id]:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}

// GET /api/promotions/:id - Get single promotion
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promotionId } = await params

    if (!isSupabaseActive()) {
      return NextResponse.json(
        { success: false, message: 'Supabase no está activo' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const orgId = (request.headers.get('x-organization-id') || '').trim()
    if (!orgId) return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .eq('organization_id', orgId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: 'Promoción no encontrada' },
        { status: 404 }
      )
    }

    // Get associated products
    const { data: links } = await supabase
      .from('promotions_products')
      .select('product_id')
      .eq('promotion_id', promotionId)
      .eq('organization_id', orgId)

    const productIds = (links || []).map((l: { product_id: string }) => l.product_id)

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        productCount: productIds.length
      }
    })
  } catch (error: unknown) {
    console.error('Error in GET /api/promotions/[id]:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
