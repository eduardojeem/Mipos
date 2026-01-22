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

    // Verify promotion exists
    const { data: existing, error: existError } = await (supabase as any)
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .single()

    if (existError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Promoción no encontrada' },
        { status: 404 }
      )
    }

    // Prepare update payload
    const updatePayload: any = {}
    
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
    const { data, error } = await (supabase as any)
      .from('promotions')
      .update(updatePayload)
      .eq('id', promotionId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Error al actualizar la promoción' },
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
  } catch (error: any) {
    console.error('Error in PATCH /api/promotions/[id]:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Error interno del servidor' },
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

    // Verify promotion exists
    const { data: existing, error: existError } = await (supabase as any)
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .single()

    if (existError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Promoción no encontrada' },
        { status: 404 }
      )
    }

    // Delete promotion-product relationships first
    await (supabase as any)
      .from('promotions_products')
      .delete()
      .eq('promotion_id', promotionId)

    // Delete promotion
    const { error: deleteError } = await (supabase as any)
      .from('promotions')
      .delete()
      .eq('id', promotionId)

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: 'Error al eliminar la promoción' },
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
  } catch (error: any) {
    console.error('Error in DELETE /api/promotions/[id]:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Error interno del servidor' },
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

    const { data, error } = await (supabase as any)
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: 'Promoción no encontrada' },
        { status: 404 }
      )
    }

    // Get associated products
    const { data: links } = await (supabase as any)
      .from('promotions_products')
      .select('product_id')
      .eq('promotion_id', promotionId)

    const productIds = (links || []).map((l: any) => l.product_id)

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        productCount: productIds.length
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/promotions/[id]:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
