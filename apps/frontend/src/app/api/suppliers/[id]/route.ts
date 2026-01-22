import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/api'

function isDevMockMode(req?: NextRequest) {
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isDev = process.env.NODE_ENV === 'development'
  const headerMode = req?.headers.get('x-env-mode') || req?.headers.get('X-Env-Mode') || ''
  const forcedMock = String(headerMode).toLowerCase() === 'mock' || process.env.MOCK_AUTH === 'true'
  return (isDev && (!hasSupabaseEnv || forcedMock)) || forcedMock
}

// GET /api/suppliers/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (isDevMockMode(request)) {
      // Return mock supplier
      const mock = {
        id,
        name: 'Proveedor Demo Mock',
        contactInfo: {
          phone: '+52 555-000-0000',
          email: 'mock@demo.com',
          address: 'Calle Mock 123',
          contactPerson: 'Mock Person'
        },
        taxId: 'MOCK123456',
        status: 'active',
        category: 'general',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return NextResponse.json(mock)
    }

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
    }

    // Map to frontend structure
    const mappedSupplier = {
      id: supplier.id,
      name: supplier.name,
      category: 'General',
      status: supplier.is_active ? 'active' : 'inactive',
      contactInfo: {
        email: supplier.email || undefined,
        phone: supplier.phone || undefined,
        address: supplier.address || undefined,
        contactPerson: supplier.contact_name || undefined
      },
      taxId: supplier.tax_id || undefined,
      createdAt: supplier.created_at,
      updatedAt: supplier.updated_at
    }

    return NextResponse.json(mappedSupplier)
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status }
    )
  }
}

// PUT /api/suppliers/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    if (isDevMockMode(request)) {
      return NextResponse.json({ ...body, id })
    }

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

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
      .update(dbData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status }
    )
  }
}

// DELETE /api/suppliers/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (isDevMockMode(request)) {
      return NextResponse.json({ success: true })
    }

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)
    return NextResponse.json(
      { error: 'Internal server error', details },
      { status }
    )
  }
}
