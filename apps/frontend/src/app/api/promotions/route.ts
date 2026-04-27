import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isSupabaseActive } from '@/lib/env'
import { getValidatedOrganizationId } from '@/lib/organization'
import {
  createPromotion,
  queryPromotions,
} from './data'
import { logAudit } from '@/app/api/admin/_utils/audit'

import { Promotion } from '@/types/promotions'

type PromotionStatus = 'active' | 'inactive' | 'all' | 'scheduled' | 'expired'

type CachedEntry = {
  expiresAt: number
  payload: { success: boolean; data: Promotion[]; count: number; pages: number }
  headers: Record<string, string>
}

type RawPromotionRow = {
  id: string
  name: string
  description: string | null
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discount_value: number
  start_date: string
  end_date: string
  is_active: boolean
  min_purchase_amount: number | null
  max_discount_amount: number | null
  usage_limit: number | null
  usage_count: number | null
  promotions_products?: Array<{
    product_id: string
    products?: {
      name?: string | null
      categories?: {
        name?: string | null
      } | null
    } | null
  }>
}

const promotionsCache = new Map<string, CachedEntry>()

function buildKey(q: {
  orgId: string
  page: number
  limit: number
  search: string
  status: PromotionStatus
  category: string
}) {
  return `promotions:${q.orgId}:${q.page}:${q.limit}:${q.search}:${q.status}:${q.category}`
}

function ttlFor(params: { status: string; search: string }) {
  if (params.search) return 10_000
  if (params.status === 'active') return 30_000
  return 20_000
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || '20')))
    const search = (searchParams.get('search') || '').trim()
    const statusParam = (searchParams.get('status') || 'all').trim().toLowerCase()
    const status = (['active', 'inactive', 'all', 'scheduled', 'expired'].includes(statusParam)
      ? statusParam
      : 'all') as PromotionStatus
    const category = (searchParams.get('category') || '').trim()
    const refresh = (searchParams.get('refresh') || '').toLowerCase() === 'true'

    const orgId = (request.headers.get('x-organization-id') || '').trim()
      || (await getValidatedOrganizationId(request))
      || ''

    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const key = buildKey({ orgId, page, limit, search, status, category })
    const now = Date.now()
    const cached = promotionsCache.get(key)

    if (!refresh && cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload, { headers: { ...cached.headers, 'x-cache': 'HIT' } })
    }

    const started = Date.now()

    if (!isSupabaseActive()) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, message: 'Database connection not available' }, { status: 503 })
      }

      const { items, total, pages } = queryPromotions({ page, limit, search, status, category })
      return NextResponse.json(
        { success: true, data: items, count: total, pages },
        { headers: { 'x-source': 'memory' } }
      )
    }

    const supabase = await createClient()
    const query = supabase
      .from('promotions')
      .select(
        `id,name,description,discount_type,discount_value,start_date,end_date,is_active,min_purchase_amount,max_discount_amount,usage_limit,usage_count,
         promotions_products(product_id,products(id,name))`,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)

    if (search) {
      query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const nowIso = new Date().toISOString()
    if (status === 'inactive') {
      query.eq('is_active', false)
    } else if (status === 'scheduled') {
      query.eq('is_active', true).gt('start_date', nowIso)
    } else if (status === 'expired') {
      query.eq('is_active', true).lt('end_date', nowIso)
    } else if (status === 'active') {
      query.eq('is_active', true).lte('start_date', nowIso).gte('end_date', nowIso)
    }

    const start = (page - 1) * limit
    const end = start + limit - 1
    const { data: rows, count, error } = await query
      .range(start, end)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API/Promotions] Supabase error:', error)
      return NextResponse.json({
        success: false,
        message: 'Error al obtener promociones',
        error: error.message,
      }, { status: 500 })
    }

    const rawRows = ((rows as RawPromotionRow[] | null) || [])
    const promoIds = rawRows.map((row) => row.id)
    const redemptionsByPromo: Record<string, { count: number; discount: number }> = {}

    if (promoIds.length > 0) {
      const { data: redRows } = await supabase
        .from('promotion_redemptions')
        .select('promotion_id, discount_amount')
        .in('promotion_id', promoIds)
        .eq('organization_id', orgId)

      if (Array.isArray(redRows)) {
        for (const row of redRows as Array<{ promotion_id: string; discount_amount: number | null }>) {
          const promotionId = String(row.promotion_id)
          const current = redemptionsByPromo[promotionId] || { count: 0, discount: 0 }
          current.count += 1
          current.discount += Number(row.discount_amount || 0)
          redemptionsByPromo[promotionId] = current
        }
      }
    }

    const normalized: Promotion[] = rawRows.map((row) => {
      const applicableProducts = (row.promotions_products || [])
        .map((link) => ({
          id: link.product_id,
          name: link.products?.name || '',
          category: link.products?.categories?.name || '',
        }))
        .filter((product) => product.id)

      const aggregated = redemptionsByPromo[row.id] || { count: 0, discount: 0 }

      return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        discountType: row.discount_type,
        discountValue: Number(row.discount_value || 0),
        startDate: row.start_date,
        endDate: row.end_date,
        isActive: Boolean(row.is_active),
        minPurchaseAmount: Number(row.min_purchase_amount || 0),
        maxDiscountAmount: Number(row.max_discount_amount || 0),
        usageLimit: Number(row.usage_limit || 0),
        usageCount: Math.max(Number(row.usage_count || 0), aggregated.count),
        applicableProducts,
      }
    })

    const total = count || 0
    const pages = Math.ceil(total / limit)
    const payload = { success: true, data: normalized, count: total, pages }
    const headers = {
      'x-source': 'supabase',
      'x-duration-ms': String(Date.now() - started),
      'x-cache': 'MISS',
    }

    promotionsCache.set(key, { expiresAt: now + ttlFor({ status, search }), payload, headers })
    return NextResponse.json(payload, { headers: { ...headers, 'Cache-Control': 'private, max-age=30' } })
  } catch (error: unknown) {
    console.error('[API/Promotions] Global error:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({
      success: false,
      message,
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let promotionIdToRollback: string | null = null
  let rollbackOrganizationId = ''

  try {
    const body = await request.json()
    let orgId = (request.headers.get('x-organization-id') || '').trim()
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    if (!orgId) {
      orgId = (await getValidatedOrganizationId(request)) || ''
    }

    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    rollbackOrganizationId = orgId

    if (!isSupabaseActive()) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, message: 'Database connection not available' }, { status: 503 })
      }

      const created = createPromotion(body)
      return NextResponse.json({ success: true, data: created })
    }

    const productIds: string[] = Array.isArray(body.applicableProductIds)
      ? Array.from(
        new Set(
          body.applicableProductIds
            .map((productId: unknown) => String(productId).trim())
            .filter((productId: string): productId is string => productId.length > 0)
        )
      )
      : []

    if (productIds.length > 0) {
      const { data: validProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .in('id', productIds)

      if (productsError) {
        throw new Error('No se pudo validar los productos de la promocion')
      }

      const validProductIds = new Set(
        ((validProducts || []) as Array<{ id: string }>).map((product) => String(product.id))
      )

      if (validProductIds.size !== productIds.length) {
        const invalidProductIds = productIds.filter((id) => !validProductIds.has(id))
        return NextResponse.json({
          success: false,
          message: 'Algunos productos no existen, no estan activos o no pertenecen a la organizacion',
          invalidProductIds,
        }, { status: 400 })
      }
    }

    const { data: promotion, error: promoError } = await supabaseAdmin
      .from('promotions')
      .insert({
        name: body.name,
        description: body.description,
        discount_type: body.discountType,
        discount_value: body.discountValue,
        start_date: body.startDate,
        end_date: body.endDate,
        is_active: true,
        min_purchase_amount: body.minPurchaseAmount || 0,
        max_discount_amount: body.maxDiscountAmount || 0,
        usage_limit: body.usageLimit || 0,
        organization_id: orgId,
      })
      .select()
      .single()

    if (promoError) throw promoError

    promotionIdToRollback = String(promotion.id)

    if (productIds.length > 0) {
      const links = productIds.map((productId) => ({
        promotion_id: promotion.id,
        product_id: productId,
        organization_id: orgId,
      }))

      const { error: linksError } = await supabase
        .from('promotions_products')
        .insert(links)

      if (linksError) {
        console.error('[API/Promotions] Error inserting product links:', linksError)
        await supabase
          .from('promotions')
          .delete()
          .eq('id', promotion.id)
          .eq('organization_id', orgId)

        promotionIdToRollback = null
        return NextResponse.json({
          success: false,
          message: 'No se pudo crear la promocion porque fallo la asociacion de productos',
        }, { status: 500 })
      }
    }

    // 3. Auditoría
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user?.id || null,
        table_name: 'promotions',
        record_id: promotion.id,
        action: 'CREATE',
        organization_id: orgId,
        changes: promotion
      }).catch(() => {})

    try {
      logAudit('promotion_created', {
        entityType: 'PROMOTION',
        entityId: promotion.id,
        newData: promotion,
        userId: user?.id,
        organization_id: orgId,
      })
    } catch (auditError) {
      console.error('[API/Promotions] Audit error:', auditError)
    }

    promotionIdToRollback = null
    return NextResponse.json({ success: true, data: promotion })
  } catch (error: unknown) {
    if (promotionIdToRollback) {
      try {
        const supabase = await createClient()
        let rollbackQuery = supabase.from('promotions').delete().eq('id', promotionIdToRollback)
        if (rollbackOrganizationId) {
          rollbackQuery = rollbackQuery.eq('organization_id', rollbackOrganizationId)
        }
        await rollbackQuery
      } catch (rollbackError) {
        console.error('[API/Promotions] Rollback error:', rollbackError)
      }
    }

    console.error('[API/Promotions] POST error:', error)
    const message = error instanceof Error ? error.message : 'No se pudo crear la promocion'
    return NextResponse.json({
      success: false,
      message,
    }, { status: 500 })
  }
}
