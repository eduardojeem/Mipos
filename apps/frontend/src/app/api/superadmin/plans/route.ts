import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { sanitizeSearch } from '@/app/api/_utils/search'
import {
  dedupeCanonicalPlans,
  getCanonicalPlanDefaults,
  getCanonicalPlanDisplayName,
  isCanonicalPlanSlug,
  normalizePlanSlug,
  sanitizePlanFeatures,
  sanitizePlanLimits,
} from '@/lib/plan-catalog'

interface PlanLimits {
  maxUsers: number
  maxProducts: number
  maxTransactionsPerMonth: number
  maxLocations: number
  maxServices: number
  maxAppointmentsPerMonth: number
  maxStaff: number
}

type PlanRow = {
  id?: string
  slug: string
  limits?: PlanLimits
  price_monthly?: number | null
  price_yearly?: number | null
  [key: string]: unknown
}

type PlanSubscriptionRow = {
  plan_id?: string | null
  organization_id?: string | null
  status?: string | null
  billing_cycle?: string | null
}

type OrganizationPlanRow = {
  id?: string | null
  subscription_plan?: string | null
  subscription_status?: string | null
}

type SupabasePlanError = {
  code?: string
  message?: string
  details?: string
}

function getMissingColumn(error: SupabasePlanError | null | undefined) {
  if (!error || !['42703', 'PGRST204'].includes(String(error.code || ''))) return null
  const message = String(error.message || error.details || '')
  const match = message.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of relation/i)
    || message.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i)
    || message.match(/find the ['"]([a-zA-Z0-9_]+)['"] column/i)
  return match?.[1] || null
}

function getPlanConstraintMessage(error: SupabasePlanError | null | undefined) {
  if (!error || error.code !== '23514') return null
  const message = String(error.message || error.details || '')
  if (message.includes('price_yearly')) {
    return 'El precio anual no puede superar 12 meses del precio mensual'
  }
  if (message.includes('price_monthly')) {
    return 'El precio mensual no puede ser negativo'
  }
  return 'El plan no cumple una regla de validacion de la base de datos'
}

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createAdminClient()

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const status = (searchParams.get('status') || 'active').trim().toLowerCase()
    const sort = (searchParams.get('sort') || 'price_monthly_asc').trim().toLowerCase()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '50', 10))) // Default 50 as per PRD
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('saas_plans')
      .select('*', { count: 'exact' })

    if (search) {
      // Optimized search with ilike for better performance
      { const s = sanitizeSearch(search); query = query.or(`name.ilike.%${s}%,slug.ilike.%${s}%`) }
    }

    if (status === 'active') query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)

    // Add timeout and optimized ordering
    let ordered = query
    if (sort === 'price_monthly_desc') ordered = ordered.order('price_monthly', { ascending: false })
    else if (sort === 'slug_asc') ordered = ordered.order('slug', { ascending: true })
    else if (sort === 'slug_desc') ordered = ordered.order('slug', { ascending: false })
    else if (sort === 'updated_at_desc') ordered = ordered.order('updated_at', { ascending: false })
    else ordered = ordered.order('price_monthly', { ascending: true })

    const { data, error } = await ordered
      .range(from, to)
      .limit(pageSize) // Explicit limit for better performance

    if (error) {
      // Handle table not found error gracefully
      if (error.code === '42P01') {
        console.warn('saas_plans table not found, returning empty data')
        return NextResponse.json({ plans: [], total: 0, page, pageSize })
      }
      
      // Log error for debugging but don't expose internal details
      console.error('Error fetching plans:', error)
      return NextResponse.json({ 
        error: 'Error al cargar planes del sistema',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    const planRows = (data || []) as PlanRow[]

    const planCodes = new Set(planRows.map((plan) => normalizePlanSlug(plan.slug)))
    const usageByPlan = new Map<string, { organizations: Set<string>; active: number; mrr: number }>()
    const priceByPlan = new Map<string, { monthly: number; yearly: number }>()

    planRows.forEach((plan) => {
      const code = normalizePlanSlug(String(plan.slug || ''))
      priceByPlan.set(code, {
        monthly: Number(plan.price_monthly || 0),
        yearly: Number(plan.price_yearly || 0),
      })
    })

    if (planCodes.size > 0) {
      const [{ data: organizations, error: organizationsError }, { data: subscriptions, error: usageError }] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, subscription_plan, subscription_status'),
        supabase
          .from('saas_subscriptions')
          .select('organization_id, status, billing_cycle'),
      ])

      if (organizationsError) {
        console.error('Error fetching organization plan usage:', organizationsError)
      }

      if (usageError) {
        console.error('Error fetching subscription billing usage:', usageError)
      }

      const subscriptionByOrg = new Map(
        ((subscriptions || []) as PlanSubscriptionRow[])
          .filter((subscription) => subscription.organization_id)
          .map((subscription) => [String(subscription.organization_id), subscription])
      )

      ;((organizations || []) as OrganizationPlanRow[]).forEach((organization) => {
        const organizationId = String(organization.id || '')
        if (!organizationId) return

        const code = normalizePlanSlug(organization.subscription_plan)
        if (!planCodes.has(code)) return

        const current = usageByPlan.get(code) || { organizations: new Set<string>(), active: 0, mrr: 0 }
        current.organizations.add(organizationId)

        const organizationStatus = String(organization.subscription_status || '').toUpperCase()
        const isActive = ['ACTIVE', 'TRIAL', 'TRIALING'].includes(organizationStatus)
        if (isActive) {
          const subscription = subscriptionByOrg.get(organizationId)
          const billingCycle = String(subscription?.billing_cycle || '').toLowerCase()
          const prices = priceByPlan.get(code)
          current.active += 1
          current.mrr += billingCycle === 'yearly' ? Number(prices?.yearly || 0) / 12 : Number(prices?.monthly || 0)
        }

        usageByPlan.set(code, current)
      })
    }

    // Process plans with optimized mapping
    const plans = dedupeCanonicalPlans(planRows.map((plan) => {
      const slug = normalizePlanSlug(String(plan.slug || '').toLowerCase());
      const usage = usageByPlan.get(slug)
      return {
        ...plan,
        slug,
        name: getCanonicalPlanDisplayName(plan.slug as string),
        features: sanitizePlanFeatures(plan.features, slug),
        limits: sanitizePlanLimits(plan.limits, slug),
        organization_count: usage?.organizations.size || 0,
        active_subscription_count: usage?.active || 0,
        mrr: usage?.mrr || 0,
      };
    }))

    const response = NextResponse.json({
      plans: plans,
      total: plans.length,
      page,
      pageSize,
    })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    
    return response
  } catch (err) {
    console.error('Unexpected error in plans API:', err)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createAdminClient()

    const defaults = [
      {
        ...getCanonicalPlanDefaults('free'),
        price_monthly: 0,
        price_yearly: 0,
        is_active: true,
      },
      {
        ...getCanonicalPlanDefaults('starter'),
        price_monthly: 100000,
        price_yearly: 1080000,
        is_active: true,
      },
      {
        ...getCanonicalPlanDefaults('professional'),
        price_monthly: 200000,
        price_yearly: 2160000,
        is_active: true,
      },
      {
        ...getCanonicalPlanDefaults('enterprise'),
        price_monthly: 0,
        price_yearly: 0,
        is_active: false,
      },
    ]

    let { error } = await supabase
      .from('saas_plans')
      .upsert(defaults, { onConflict: 'slug' })

    if (error && String(error.code) === '42703') {
      const minimal = defaults.map((p) => ({
        name: p.name,
        slug: p.slug,
        price_monthly: p.price_monthly,
        price_yearly: p.price_yearly,
        is_active: p.is_active,
      }))
      const r = await supabase
        .from('saas_plans')
        .upsert(minimal, { onConflict: 'slug' })
      error = r.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Planes sincronizados correctamente' })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createAdminClient()

    const body = await request.json()
    const rawSlug = String(body.slug || '').trim().toLowerCase()
    const normalizedSlug = normalizePlanSlug(rawSlug)
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json({ 
        error: 'Nombre y slug son requeridos',
        field: !body.name ? 'name' : 'slug'
      }, { status: 400 })
    }

    if (!isCanonicalPlanSlug(rawSlug)) {
      return NextResponse.json({
        error: 'Solo se pueden crear planes base: free, starter, professional o enterprise',
        field: 'slug'
      }, { status: 400 })
    }

    // Validate price values
    const priceMonthly = Number(body.price_monthly ?? 0)
    const priceYearly = Number(body.price_yearly ?? 0)
    
    if (priceMonthly < 0 || priceYearly < 0) {
      return NextResponse.json({ 
        error: 'Los precios no pueden ser negativos',
        field: 'price'
      }, { status: 400 })
    }

    if (priceYearly > priceMonthly * 12) {
      return NextResponse.json({
        error: 'El precio anual no puede superar 12 meses del precio mensual',
        field: 'price_yearly'
      }, { status: 400 })
    }

    const plan = {
      name: String(body.name).trim(),
      slug: normalizedSlug,
      description: String(body.description || '').trim(),
      price_monthly: priceMonthly,
      price_yearly: priceYearly,
      currency: String(body.currency || 'PYG').toUpperCase(),
      trial_days: Math.max(0, Number(body.trial_days ?? 0)),
      is_active: Boolean(body.is_active ?? true),
      features: sanitizePlanFeatures(body.features, normalizedSlug),
      limits: sanitizePlanLimits(body.limits, normalizedSlug),
    }

    let nextPlan: Record<string, unknown> = { ...plan }
    let data: PlanRow | null = null
    let error: SupabasePlanError | null = null

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await supabase
        .from('saas_plans')
        .insert(nextPlan)
        .select('*')
        .single()

      data = result.data as PlanRow | null
      error = result.error as SupabasePlanError | null

      const missingColumn = getMissingColumn(error)
      if (!missingColumn || !(missingColumn in nextPlan)) break

      console.warn(`saas_plans.${missingColumn} column not found, retrying plan insert without it`)
      const { [missingColumn]: _removed, ...remainingPlan } = nextPlan
      nextPlan = remainingPlan
    }

    if (error) {
      console.error('Error creating plan:', error)
      return NextResponse.json({ 
        error: 'Error al crear el plan',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    // Add cache headers for the new resource
    const response = NextResponse.json({ success: true, plan: data })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    
    return response
  } catch (err) {
    console.error('Unexpected error creating plan:', err)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createAdminClient()

    const body = await request.json()
    const id = String(body.id || '')
    const rawSlug = body.slug !== undefined ? String(body.slug || '').trim().toLowerCase() : ''
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    if (body.slug !== undefined && !isCanonicalPlanSlug(rawSlug)) {
      return NextResponse.json({
        error: 'Solo se pueden usar planes base: free, starter, professional o enterprise',
        field: 'slug'
      }, { status: 400 })
    }

    // Validate price values if provided
    if (body.price_monthly !== undefined && Number(body.price_monthly) < 0) {
      return NextResponse.json({ error: 'El precio mensual no puede ser negativo' }, { status: 400 })
    }
    if (body.price_yearly !== undefined && Number(body.price_yearly) < 0) {
      return NextResponse.json({ error: 'El precio anual no puede ser negativo' }, { status: 400 })
    }
    if (
      body.price_monthly !== undefined
      && body.price_yearly !== undefined
      && Number(body.price_yearly) > Number(body.price_monthly) * 12
    ) {
      return NextResponse.json({
        error: 'El precio anual no puede superar 12 meses del precio mensual',
        field: 'price_yearly'
      }, { status: 400 })
    }

    let updateSlug = body.slug ? normalizePlanSlug(String(body.slug)) : undefined
    if (!updateSlug && (body.features !== undefined || body.limits !== undefined)) {
      const { data: currentPlan } = await supabase
        .from('saas_plans')
        .select('slug')
        .eq('id', id)
        .maybeSingle()
      updateSlug = normalizePlanSlug((currentPlan as { slug?: string | null } | null)?.slug)
    }
    const limits = body.limits && typeof body.limits === 'object'
      ? sanitizePlanLimits(body.limits, updateSlug)
      : undefined

    const updates: Record<string, unknown> = {
      name: body.name ? String(body.name).trim() : undefined,
      slug: updateSlug,
      description: body.description !== undefined ? String(body.description).trim() : undefined,
      price_monthly: body.price_monthly !== undefined ? Number(body.price_monthly) : undefined,
      price_yearly: body.price_yearly !== undefined ? Number(body.price_yearly) : undefined,
      currency: body.currency ? String(body.currency).toUpperCase() : undefined,
      trial_days: body.trial_days !== undefined ? Math.max(0, Number(body.trial_days)) : undefined,
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : undefined,
      features: body.features !== undefined ? sanitizePlanFeatures(body.features, updateSlug) : undefined,
      limits,
      max_users: limits?.maxUsers,
      max_products: limits?.maxProducts,
      max_transactions_per_month: limits?.maxTransactionsPerMonth,
      max_locations: limits?.maxLocations,
      updated_at: new Date().toISOString(),
    }

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key]
      }
    })

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    let nextUpdates = { ...updates }
    let data: PlanRow | null = null
    let error: SupabasePlanError | null = null

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await supabase
        .from('saas_plans')
        .update(nextUpdates)
        .eq('id', id)
        .select('*')
        .single()

      data = result.data as PlanRow | null
      error = result.error as SupabasePlanError | null

      const missingColumn = getMissingColumn(error)
      if (!missingColumn || !(missingColumn in nextUpdates)) break

      console.warn(`saas_plans.${missingColumn} column not found, retrying plan update without it`)
      const { [missingColumn]: _removed, ...remainingUpdates } = nextUpdates
      nextUpdates = remainingUpdates
    }

    if (error) {
      const validationMessage = getPlanConstraintMessage(error)
      if (validationMessage) {
        return NextResponse.json({
          error: validationMessage,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 400 })
      }

      console.error('Error updating plan:', error)
      return NextResponse.json({ 
        error: 'Error al actualizar el plan',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    // Add cache headers
    const response = NextResponse.json({ success: true, plan: data })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    
    return response
  } catch (err) {
    console.error('Unexpected error updating plan:', err)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Validate ID format
    if (!id.match(/^[a-f0-9-]{36}$/)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // First check if plan exists and can be deleted
    const { data: existingPlan } = await supabase
      .from('saas_plans')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    const { data: subscriptions, error: subsError } = await supabase
      .from('saas_subscriptions')
      .select('id')
      .eq('plan_id', id)
      .limit(1)

    if (subsError) {
      console.error('Error checking subscriptions for plan:', subsError)
      return NextResponse.json({
        error: 'Error al validar suscripciones del plan',
        details: process.env.NODE_ENV === 'development' ? subsError.message : undefined
      }, { status: 500 })
    }

    if (subscriptions && subscriptions.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar este plan porque está siendo utilizado por organizaciones activas',
        code: 'PLAN_IN_USE'
      }, { status: 400 })
    }

    const { data: planToDelete } = await supabase
      .from('saas_plans')
      .select('slug')
      .eq('id', id)
      .single()

    const planCode = normalizePlanSlug(planToDelete?.slug)
    const { data: organizations, error: orgUsageError } = await supabase
      .from('organizations')
      .select('id')
      .in('subscription_plan', [planCode, planCode.toUpperCase()])
      .limit(1)

    if (orgUsageError) {
      console.error('Error checking organization usage for plan:', orgUsageError)
      return NextResponse.json({
        error: 'Error al validar organizaciones del plan',
        details: process.env.NODE_ENV === 'development' ? orgUsageError.message : undefined
      }, { status: 500 })
    }

    if (organizations && organizations.length > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar este plan porque esta asignado a organizaciones',
        code: 'PLAN_IN_USE'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('saas_plans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting plan:', error)
      return NextResponse.json({ 
        error: 'Error al eliminar el plan',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error deleting plan:', err)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
}
