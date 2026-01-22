import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/api'
import { Supplier } from '@/types/supabase'

function isDevMockMode(req?: NextRequest) {
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isDev = process.env.NODE_ENV === 'development'
  const headerMode = req?.headers.get('x-env-mode') || req?.headers.get('X-Env-Mode') || ''
  const forcedMock = String(headerMode).toLowerCase() === 'mock' || process.env.MOCK_AUTH === 'true'
  return (isDev && (!hasSupabaseEnv || forcedMock)) || forcedMock
}

// GET /api/suppliers
export async function GET(request: NextRequest) {
  try {
    // Check for mock mode
    if (isDevMockMode(request)) {
      const mock = {
        suppliers: [
          {
            id: 'mock-supplier-1',
            name: 'Proveedor Demo Uno',
            contactInfo: {
              phone: '+52 555-123-4567',
              email: 'proveedor1@demo.com',
              address: 'Av. Siempre Viva 742, CDMX',
              contactPerson: 'Juan Pérez'
            },
            taxId: 'DEM123456789',
            notes: 'Proveedor de pruebas',
            status: 'active',
            category: 'regular',
            commercialConditions: {
              paymentTerms: 30,
              creditLimit: 50000,
              discount: 5
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastPurchase: new Date().toISOString(),
            totalPurchases: 150000,
            _count: { purchases: 12 }
          },
          {
            id: 'mock-supplier-2',
            name: 'Distribuciones Norte',
            contactInfo: {
              phone: '+52 555-987-6543',
              email: 'ventas@distribucionesnorte.com',
              address: 'Calle Comercio 101, Monterrey',
              contactPerson: 'María García'
            },
            taxId: 'NOR987654321',
            notes: 'Proveedor regional',
            status: 'active',
            category: 'premium',
            commercialConditions: {
              paymentTerms: 45,
              creditLimit: 80000,
              discount: 8
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastPurchase: new Date().toISOString(),
            totalPurchases: 220000,
            _count: { purchases: 20 }
          }
        ],
        pagination: {
          page: 1,
          pages: 1,
          total: 2
        }
      }
      return NextResponse.json(mock)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: suppliersData, error, count } = await query

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map database fields to frontend structure
    const suppliers = suppliersData?.map((supplier: Supplier) => ({
      id: supplier.id,
      name: supplier.name,
      category: 'General', // Default value as it's not in DB
      status: supplier.is_active ? 'active' : 'inactive',
      contactInfo: {
        email: supplier.email || undefined,
        phone: supplier.phone || undefined,
        address: supplier.address || undefined,
        contactPerson: supplier.contact_name || undefined
      },
      taxId: supplier.tax_id || undefined,
      createdAt: supplier.created_at,
      updatedAt: supplier.updated_at,
      // Default values for stats not yet implemented
      totalPurchases: 0,
      totalOrders: 0,
      _count: { purchases: 0 }
    })) || []

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      suppliers,
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

    // Mock mode for POST
    if (isDevMockMode(request)) {
      return NextResponse.json({
        ...body,
        id: `mock-supplier-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { status: 201 })
    }

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Map frontend structure to database fields
    const dbData = {
      name: body.name,
      contact_name: body.contactInfo?.contactPerson,
      email: body.contactInfo?.email,
      phone: body.contactInfo?.phone,
      address: body.contactInfo?.address,
      tax_id: body.taxId,
      is_active: body.status === 'active'
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

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status }
    )
  }
}
