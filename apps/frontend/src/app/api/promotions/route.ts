import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseActive, getSupabaseConfig } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  listPromotions,
  createPromotion,
  type PromotionCreateInput,
  queryPromotions,
} from './data'
import { logAudit } from '@/app/api/admin/_utils/audit'

// Simple in-memory cache per server instance
type CachedEntry = { expiresAt: number; payload: any; headers: Record<string, string> }
const promotionsCache = new Map<string, CachedEntry>()

function buildKey(q: { page: number; limit: number; search: string; status: 'active'|'inactive'|'all'; category: string; dateFrom?: string; dateTo?: string }) {
  return `promotions:${q.page}:${q.limit}:${q.search}:${q.status}:${q.category}:${q.dateFrom || ''}:${q.dateTo || ''}`
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
    const status = (searchParams.get('status') || 'all') as 'active' | 'inactive' | 'all'
    const category = (searchParams.get('category') || '').trim()
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const refresh = (searchParams.get('refresh') || '').toLowerCase() === 'true'

    const key = buildKey({ page, limit, search, status, category, dateFrom, dateTo })
    const now = Date.now()
    const cached = promotionsCache.get(key)
    if (!refresh && cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload, { headers: { ...cached.headers, 'x-cache': 'HIT' } })
    }

    const started = Date.now()

    if (getSupabaseConfig()) {
      let supabase: any
      let isAdmin = false

      // Intenta usar cliente admin si está disponible (para evitar bloqueos RLS en dashboard)
      // Solo si se solicitan todas las promociones (uso típico de dashboard)
      if (status === 'all' || status === 'inactive') {
        try {
          supabase = createAdminClient()
          isAdmin = true
        } catch {
          // Fallback a cliente estándar
          supabase = await createClient()
        }
      } else {
        supabase = await createClient()
      }

      const canQuery = typeof (supabase as any)?.from === 'function'
      if (!canQuery) {
        const { items, total, pages } = queryPromotions({ page, limit, search, status, category, dateFrom, dateTo })
        const payload = { success: true, data: items, count: total, pages }
        const headers = { 'x-source': 'memory', 'x-duration-ms': String(Date.now() - started) }
        logAudit('promotions.fetch_fallback', { reason: 'no_supabase_client', entityType: 'PROMOTION', oldData: null, newData: { count: total } })
        promotionsCache.set(key, { expiresAt: now + ttlFor({ status, search }), payload, headers })
        return NextResponse.json(payload, { headers: { ...headers, 'x-cache': 'MISS' } })
      }

      let query = (supabase as any)
        .from('promotions')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }
      if (status !== 'all') {
        query = query.eq('is_active', status === 'active')
      }
      if (dateFrom) {
        query = query.gte('end_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('start_date', dateTo)
      }

      if (category) {
        const { data: catRows } = await (supabase as any)
          .from('categories')
          .select('id,name')
          .or(`id.eq.${category},name.ilike.%${category}%`)

        const catIds: string[] = Array.isArray(catRows) ? catRows.map((c: any) => String(c.id)) : []
        if (catIds.length === 0) {
          const payload = { success: true, data: [], count: 0, pages: 1 }
          const headers = { 'x-source': 'supabase', 'x-duration-ms': String(Date.now() - started) }
          promotionsCache.set(key, { expiresAt: now + ttlFor({ status, search }), payload, headers })
          return NextResponse.json(payload, { headers: { ...headers, 'x-cache': 'MISS' } })
        }

        const { data: prodsForCat } = await (supabase as any)
          .from('products')
          .select('id')
          .in('category_id', catIds)

        const productIds: string[] = Array.isArray(prodsForCat) ? prodsForCat.map((p: any) => String(p.id)) : []
        if (productIds.length === 0) {
          const payload = { success: true, data: [], count: 0, pages: 1 }
          const headers = { 'x-source': 'supabase', 'x-duration-ms': String(Date.now() - started) }
          promotionsCache.set(key, { expiresAt: now + ttlFor({ status, search }), payload, headers })
          return NextResponse.json(payload, { headers: { ...headers, 'x-cache': 'MISS' } })
        }

        const { data: linksCat } = await (supabase as any)
          .from('promotions_products')
          .select('promotion_id')
          .in('product_id', productIds)

        const promoIdsForCategory: string[] = Array.isArray(linksCat)
          ? Array.from(new Set(linksCat.map((l: any) => String(l.promotion_id))))
          : []

        if (promoIdsForCategory.length === 0) {
          const payload = { success: true, data: [], count: 0, pages: 1 }
          const headers = { 'x-source': 'supabase', 'x-duration-ms': String(Date.now() - started) }
          promotionsCache.set(key, { expiresAt: now + ttlFor({ status, search }), payload, headers })
          return NextResponse.json(payload, { headers: { ...headers, 'x-cache': 'MISS' } })
        }

        query = query.in('id', promoIdsForCategory)
      }

      const start = (page - 1) * limit
      const end = start + limit - 1
      query = query.range(start, end)

      const { data: baseRows, count, error } = await query
      if (error) {
        console.error('[API/Promotions] Error querying Supabase:', error)
        // Si falla Supabase, NO ocultar el error si estamos en un entorno que debería tener datos.
        // Sin embargo, para mantener compatibilidad, usamos fallback pero exponemos el error en headers.
        
        const { items, total, pages } = queryPromotions({ page, limit, search, status, category, dateFrom, dateTo })
        const payload = { success: true, data: items, count: total, pages }
        const headers = { 
          'x-source': 'memory', 
          'x-duration-ms': String(Date.now() - started), 
          'x-error': String((error as any)?.message || ''),
          'x-error-code': String((error as any)?.code || '')
        }
        logAudit('promotions.fetch_fallback', { reason: 'supabase_error', entityType: 'PROMOTION', oldData: null, newData: { count: total, message: String((error as any)?.message || '') } })
        promotionsCache.set(key, { expiresAt: now + ttlFor({ status, search }), payload, headers })
        return NextResponse.json(payload, { headers: { ...headers, 'x-cache': 'MISS' } })
      }

      const rows = Array.isArray(baseRows) ? baseRows : []
      const promoIds = rows.map(r => String(r.id))

      let productLinks: { promotion_id: string; product_id: string }[] = []
      if (promoIds.length > 0) {
        const { data: linksData } = await (supabase as any)
          .from('promotions_products')
          .select('promotion_id,product_id')
          .in('promotion_id', promoIds)
        productLinks = Array.isArray(linksData) ? linksData.map(l => ({ promotion_id: String(l.promotion_id), product_id: String(l.product_id) })) : []
      }

      const allProductIds = Array.from(new Set(productLinks.map(l => l.product_id)))

      const productMap: Record<string, { id: string; name?: string; category?: string }> = {}
      if (allProductIds.length > 0) {
        const { data: prods } = await (supabase as any)
          .from('products')
          .select('id,name,category_id')
          .in('id', allProductIds)
        const catIds: string[] = []
        ;(prods || []).forEach((p: any) => {
          const id = String(p.id)
          const cid = p?.category_id ? String(p.category_id) : undefined
          if (cid) catIds.push(cid)
          productMap[id] = { id, name: p?.name, category: cid }
        })
        const uniqueCatIds = Array.from(new Set(catIds)).filter(Boolean)
        if (uniqueCatIds.length > 0) {
          const { data: cats } = await (supabase as any)
            .from('categories')
            .select('id,name')
            .in('id', uniqueCatIds)
          const catMap: Record<string, string> = {}
          ;(cats || []).forEach((c: any) => { catMap[String(c.id)] = String(c.name) })
          Object.keys(productMap).forEach(pid => {
            const pcat = String(productMap[pid].category || '')
            if (pcat && catMap[pcat]) {
              productMap[pid].category = catMap[pcat]
            }
          })
        }
      }

      const normalized = rows.map(r => {
        const links = productLinks.filter(l => l.promotion_id === String(r.id))
        const applicableProducts = links.map(l => ({ id: l.product_id, name: productMap[l.product_id]?.name, category: productMap[l.product_id]?.category }))
        return {
          id: r.id,
          name: r.name,
          description: r.description || '',
          discountType: r.discount_type === 'PERCENTAGE' || r.discount_type === 'FIXED_AMOUNT' ? r.discount_type : 'PERCENTAGE',
          discountValue: Number(r.discount_value || 0),
          startDate: r.start_date,
          endDate: r.end_date,
          isActive: !!r.is_active,
          minPurchaseAmount: Number(r.min_purchase_amount || 0),
          maxDiscountAmount: Number(r.max_discount_amount || 0),
          usageLimit: Number(r.usage_limit || 0),
          usageCount: Number(r.usage_count || 0),
          applicableProducts,
        }
      })

      const filteredByCategory = normalized

      const total = typeof count === 'number' ? count : filteredByCategory.length
      const pages = Math.max(1, Math.ceil(total / limit))

      const payload = { success: true, data: filteredByCategory, count: total, pages }
      const headers = { 'x-source': 'supabase', 'x-duration-ms': String(Date.now() - started) }
      promotionsCache.set(key, { expiresAt: now + ttlFor({ status, search }), payload, headers })
      return NextResponse.json(payload, { headers: { ...headers, 'x-cache': 'MISS' } })
    }

    const { items, total, pages } = queryPromotions({ page, limit, search, status, category, dateFrom, dateTo })
    const payload = { success: true, data: items, count: total, pages }
    const headers = { 'x-source': 'memory', 'x-duration-ms': String(Date.now() - started) }
    promotionsCache.set(key, { expiresAt: now + ttlFor({ status, search }), payload, headers })
    return NextResponse.json(payload, { headers: { ...headers, 'x-cache': 'MISS' } })
  } catch (error: any) {
    const message = error?.message || 'Error interno del servidor'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PromotionCreateInput
    if (isSupabaseActive()) {
      const supabase = await createClient()
      const payload: any = {
        name: body.name,
        description: body.description,
        discount_type: body.discountType,
        discount_value: body.discountValue,
        start_date: body.startDate,
        end_date: body.endDate,
        is_active: true,
        min_purchase_amount: body.minPurchaseAmount,
        max_discount_amount: body.maxDiscountAmount,
        usage_limit: body.usageLimit,
        usage_count: 0,
      }
      const { data, error } = await (supabase as any)
        .from('promotions')
        .insert(payload)
        .select()
        .single()
      if (error) return NextResponse.json({ success: false, message: 'No se pudo crear la promoción' }, { status: 500 })
      const appIds: string[] = Array.isArray((body as any).applicableProductIds) ? (body as any).applicableProductIds.map((x: any) => String(x)) : []
      if (data?.id && appIds.length > 0) {
        const rows = appIds.map(pid => ({ promotion_id: String(data.id), product_id: pid }))
        await (supabase as any).from('promotions_products').insert(rows)
      }
      const { data: userData } = await (supabase as any).auth.getUser()
      const uid = userData?.user?.id ? String(userData.user.id) : 'system'
      await (supabase as any)
        .from('audit_logs')
        .insert({ user_id: uid, action: 'promotion_created', resource: 'promotion', details: { id: data?.id, payload } })
      logAudit('promotions.create', { entityType: 'PROMOTION', entityId: data?.id, newData: data })
      return NextResponse.json({ success: true, data })
    }
    const created = createPromotion(body)
    logAudit('promotions.create', { entityType: 'PROMOTION', entityId: created.id, newData: created })
    return NextResponse.json({ success: true, data: created })
  } catch (error: any) {
    const message = error?.message || 'No se pudo crear la promoción'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
}
