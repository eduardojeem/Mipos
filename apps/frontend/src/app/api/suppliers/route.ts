import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/api'
import { getValidatedOrganizationId } from '@/lib/organization'

// Modo mock deshabilitado: requerir datos reales de Supabase

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

    type SupplierRow = {
      id: string
      name: string
      contact_info: any
      is_active: boolean
      created_at: string
      updated_at: string
      purchases?: Array<{ count: number }>
    }

    let query = supabase
      .from('suppliers')
      .select(
        'id,name,contact_info,is_active,created_at,updated_at,purchases:purchases!fk_purchases_supplier(count)',
        { count: 'estimated' }
      )
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

    const { data: suppliersData, error, count } = await query

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const suppliers = (suppliersData as SupplierRow[] | null)?.map((supplier) => {
      const ci = (supplier as any).contact_info || {}
      const purchasesCount = Array.isArray((supplier as any).purchases)
        ? Number((supplier as any).purchases?.[0]?.count ?? 0)
        : 0

      return {
        id: supplier.id,
        name: supplier.name,
        category: String(ci.category || 'General'),
        status: supplier.is_active ? 'active' : 'inactive',
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
    }) || []

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
    const supabase = await createServerClient(cookieStore)

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
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

    const dbData = {
      name: body.name,
      contact_info,
      is_active: body.status ? body.status === 'active' : true,
      organization_id: orgId,
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([dbData])
      .select()
      .single()

    if (error) {
      console.error('Error creating supplier:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status }
    )
  }
}
