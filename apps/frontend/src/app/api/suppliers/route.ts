import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase/server'
import { getErrorMessage } from '@/lib/api'
import { getValidatedOrganizationId } from '@/lib/organization'

// Modo mock deshabilitado: requerir datos reales de Supabase

function errorMessage(error: unknown) {
  const typed = error as { message?: string; details?: string; hint?: string; code?: string }
  return [typed?.message, typed?.details, typed?.hint, typed?.code].filter(Boolean).join(' ')
}

function isMissingColumn(error: unknown, column: string) {
  const message = errorMessage(error).toLowerCase()
  return message.includes(column.toLowerCase()) && (
    message.includes('column') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  )
}

function isMissingRelationship(error: unknown) {
  const message = errorMessage(error).toLowerCase()
  return message.includes('relationship') || message.includes('fk_purchases_supplier')
}

function isContactInfoTypeError(error: unknown) {
  const message = errorMessage(error).toLowerCase()
  return message.includes('contact_info') && (
    message.includes('json') ||
    message.includes('invalid input syntax') ||
    message.includes('type')
  )
}

function normalizeContactInfo(value: unknown) {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>
  return {}
}

function mapSupplierRow(supplier: any) {
  const ci = normalizeContactInfo(supplier?.contact_info)
  const purchasesCount = Array.isArray(supplier?.purchases)
    ? Number(supplier.purchases?.[0]?.count ?? 0)
    : 0

  return {
    id: supplier.id,
    name: supplier.name,
    category: String(ci.category || 'General'),
    status: supplier.is_active === false ? 'inactive' : 'active',
    contactInfo: {
      email: ci.email || undefined,
      phone: ci.phone || undefined,
      address: ci.address || undefined,
      contactPerson: ci.contactPerson || ci.contact_name || undefined,
      website: ci.website || undefined,
    },
    taxId: ci.taxId || ci.tax_id || undefined,
    notes: ci.notes || undefined,
    commercialConditions: ci.commercialConditions || undefined,
    rating: typeof ci.rating === 'number' ? ci.rating : undefined,
    totalPurchases: 0,
    totalOrders: 0,
    createdAt: supplier.created_at,
    updatedAt: supplier.updated_at,
    _count: { purchases: purchasesCount },
  }
}


// GET /api/suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = (searchParams.get('status') || '').trim().toLowerCase()
    const category = (searchParams.get('category') || '').trim()
    const sortBy = (searchParams.get('sortBy') || 'createdAt').trim()
    const sortOrder = (searchParams.get('sortOrder') || 'desc').trim().toLowerCase()
    const offset = (page - 1) * limit

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const fullSelect = 'id,name,contact_info,is_active,created_at,updated_at,purchases:purchases!fk_purchases_supplier(count)'
    let query = supabase
      .from('suppliers')
      .select(fullSelect, { count: 'estimated' })
      .eq('organization_id', orgId)
      .range(offset, offset + limit - 1)
      .order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (status === 'active') query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)

    if (category && category.toLowerCase() !== 'all') {
      query = query.ilike('contact_info->>category', category)
    }

    let { data: suppliersData, error, count } = await query

    if (error) {
      const missingOrgColumn = isMissingColumn(error, 'organization_id')
      const missingActiveColumn = isMissingColumn(error, 'is_active')

      if (!missingOrgColumn && !missingActiveColumn && !isMissingRelationship(error)) {
        console.error('Error fetching suppliers:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const fallbackColumns = ['id', 'name', 'contact_info', 'created_at', 'updated_at']
      if (!missingActiveColumn) fallbackColumns.splice(3, 0, 'is_active')
      if (!missingOrgColumn) fallbackColumns.splice(3, 0, 'organization_id')

      let fallbackQuery = supabase
        .from('suppliers')
        .select(fallbackColumns.join(','), { count: 'estimated' })
        .range(offset, offset + limit - 1)
        .order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' })

      if (!missingOrgColumn) {
        fallbackQuery = fallbackQuery.eq('organization_id', orgId)
      }
      if (search) {
        fallbackQuery = fallbackQuery.ilike('name', `%${search}%`)
      }
      if (!missingActiveColumn) {
        if (status === 'active') fallbackQuery = fallbackQuery.eq('is_active', true)
        if (status === 'inactive') fallbackQuery = fallbackQuery.eq('is_active', false)
      }
      if (category && category.toLowerCase() !== 'all') {
        fallbackQuery = fallbackQuery.ilike('contact_info->>category', category)
      }

      const fallbackResult = await fallbackQuery
      suppliersData = fallbackResult.data
      error = fallbackResult.error
      count = fallbackResult.count

      if (error) {
        console.error('Error fetching suppliers fallback:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    const suppliers = (suppliersData || []).map(mapSupplierRow)

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [{ count: activeCount }, { count: newCount }] = await Promise.all([
      supabase
        .from('suppliers')
        .select('id', { count: 'estimated', head: true })
        .eq('organization_id', orgId)
        .eq('is_active', true),
      supabase
        .from('suppliers')
        .select('id', { count: 'estimated', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', monthStart.toISOString()),
    ])

    return NextResponse.json({
      suppliers,
      stats: {
        totalSuppliers: Number(total),
        activeSuppliers: Number(activeCount || 0),
        newThisMonth: Number(newCount || 0),
        totalPurchases: 0,
        totalOrders: 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    })

  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status }
    )
  }
}

// POST /api/suppliers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cookieStore = await cookies()
    const sessionClient = await createServerClient(cookieStore)

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Evitar duplicados: mismo nombre (case-insensitive) en la organización
    const trimmedName = String(body.name).trim()
    if (trimmedName) {
      const { data: existing } = await sessionClient
        .from('suppliers')
        .select('id')
        .eq('organization_id', orgId)
        .ilike('name', trimmedName)
        .maybeSingle()
      if (existing) {
        return NextResponse.json(
          { error: `Ya existe un proveedor con el nombre "${trimmedName}"` },
          { status: 409 }
        )
      }
    }

    const contactInfo = body.contactInfo || {}
    const contact_info = {
      email: contactInfo.email || null,
      phone: contactInfo.phone || null,
      address: contactInfo.address || null,
      contactPerson: contactInfo.contactPerson || null,
      website: contactInfo.website || null,
      taxId: body.taxId || null,
      notes: body.notes || null,
      commercialConditions: body.commercialConditions || null,
      category: body.category || null,
      rating: body.rating ?? null,
    }

    let writeClient = sessionClient
    try {
      writeClient = await createAdminClient()
    } catch (error) {
      console.warn('Supplier create using session client because admin client is unavailable:', errorMessage(error))
    }

    const dbData: Record<string, unknown> = {
      name: body.name,
      contact_info,
      is_active: body.status ? body.status === 'active' : true,
      organization_id: orgId,
    }

    const unsupportedColumns = new Set<string>()
    let insertData: Record<string, unknown> = { ...dbData }

    let { data, error } = await writeClient
      .from('suppliers')
      .insert([insertData])
      .select()
      .single()

    if (error && (isMissingColumn(error, 'organization_id') || isMissingColumn(error, 'is_active'))) {
      if (isMissingColumn(error, 'organization_id')) unsupportedColumns.add('organization_id')
      if (isMissingColumn(error, 'is_active')) unsupportedColumns.add('is_active')

      insertData = { ...dbData }
      for (const column of unsupportedColumns) delete insertData[column]

      const fallbackResult = await writeClient
        .from('suppliers')
        .insert([insertData])
        .select()
        .single()

      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error && isContactInfoTypeError(error)) {
      insertData = {
        ...insertData,
        contact_info: JSON.stringify(contact_info),
      }

      const fallbackResult = await writeClient
        .from('suppliers')
        .insert([insertData])
        .select()
        .single()

      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error('Error creating supplier:', error)
      const message = errorMessage(error) || 'No se pudo crear el proveedor'
      return NextResponse.json(
        {
          error: 'No se pudo crear el proveedor',
          details: message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data: mapSupplierRow(data) }, { status: 201 })
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status }
    )
  }
}
