import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { logAudit } from '@/app/api/admin/_utils/audit'
import { listPromotions, updatePromotion, createPromotion, setPromotionApproval, togglePromotionStatus } from '@/app/api/promotions/data'

export async function POST(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const body = await request.json().catch(() => ({}))
  const name: string = String(body?.name || 'Descuento 10% General')
  const days: number = Math.max(1, Number(body?.days || 30))
  const now = new Date()
  const startIso = now.toISOString()
  const endIso = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

  const toSupabaseShape = (p: any) => ({
    id: p.id,
    name: p.name,
    discount_type: p.discountType,
    discount_value: p.discountValue,
    start_date: p.startDate,
    end_date: p.endDate,
    is_active: p.isActive,
    approval_status: p.approvalStatus,
  })

  let supabase: any = null
  let canUseSupabase = false
  try {
    supabase = createAdminClient() as any
    canUseSupabase = true
  } catch {}

  if (canUseSupabase) {
    try {
      const { data: existing, error: findErr } = await supabase
        .from('promotions')
        .select('id,name,discount_type,discount_value,start_date,end_date,is_active,approval_status')
        .eq('name', name)
        .limit(1)

      if (findErr) {
        canUseSupabase = false
      } else if (Array.isArray(existing) && existing.length > 0) {
        const id = String(existing[0].id)
        const { data, error } = await supabase
          .from('promotions')
          .update({
            start_date: startIso,
            end_date: endIso,
            is_active: true,
            approval_status: 'approved',
          })
          .eq('id', id)
          .select('id,name,discount_type,discount_value,start_date,end_date,is_active,approval_status')
          .single()
        if (error) {
          canUseSupabase = false
        } else {
          logAudit('promotions.activate_now', { entityType: 'PROMOTION', entityId: id, newData: { name, start_date: startIso, end_date: endIso, is_active: true } })
          return NextResponse.json({ success: true, action: 'updated', data })
        }
      } else {
        const { data, error } = await supabase
          .from('promotions')
          .insert({
            name,
            description: 'Promoción activada inmediatamente',
            discount_type: 'PERCENTAGE',
            discount_value: 10,
            min_purchase_amount: 0,
            start_date: startIso,
            end_date: endIso,
            is_active: true,
            approval_status: 'approved',
          })
          .select('id,name,discount_type,discount_value,start_date,end_date,is_active,approval_status')
          .single()
        if (error) {
          canUseSupabase = false
        } else {
          logAudit('promotions.activate_now', { entityType: 'PROMOTION', entityId: String(data?.id || ''), newData: { name, start_date: startIso, end_date: endIso, is_active: true } })
          return NextResponse.json({ success: true, action: 'created', data })
        }
      }
    } catch {
      canUseSupabase = false
    }
  }

  const memExisting = listPromotions().find(p => p.name === name)
  if (memExisting) {
    const updated = updatePromotion(memExisting.id, {
      name,
      description: memExisting.description || 'Promoción activada inmediatamente',
      discountType: memExisting.discountType,
      discountValue: memExisting.discountValue,
      startDate: startIso,
      endDate: endIso,
      minPurchaseAmount: memExisting.minPurchaseAmount,
      maxDiscountAmount: memExisting.maxDiscountAmount,
      usageLimit: memExisting.usageLimit,
      applicableProductIds: (memExisting.applicableProducts || []).map(ap => ap.id),
    })
    togglePromotionStatus(memExisting.id, true)
    setPromotionApproval(memExisting.id, 'approved')
    logAudit('promotions.activate_now_fallback', { entityType: 'PROMOTION', entityId: memExisting.id, newData: { name, start_date: startIso, end_date: endIso, is_active: true } })
    return NextResponse.json(
      { success: true, action: 'updated', data: toSupabaseShape(updated) },
      { headers: { 'x-source': 'memory' } }
    )
  } else {
    const created = createPromotion({
      name,
      description: 'Promoción activada inmediatamente',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      startDate: startIso,
      endDate: endIso,
      minPurchaseAmount: 0,
      maxDiscountAmount: 0,
      usageLimit: 0,
      applicableProductIds: [],
    })
    togglePromotionStatus(created.id, true)
    setPromotionApproval(created.id, 'approved')
    logAudit('promotions.activate_now_fallback', { entityType: 'PROMOTION', entityId: created.id, newData: { name, start_date: startIso, end_date: endIso, is_active: true } })
    return NextResponse.json(
      { success: true, action: 'created', data: toSupabaseShape(created) },
      { headers: { 'x-source': 'memory' } }
    )
  }
}