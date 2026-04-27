import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/api'
import { getValidatedOrganizationId } from '@/lib/organization'

// Modo mock deshabilitado

// GET /api/suppliers/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    type SupplierRow = {
      id: string
      name: string
      contact_info: any
      is_active: boolean
      organization_id: string
      created_at: string
      updated_at: string
      purchases?: Array<{ count: number }>
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('id,name,contact_info,is_active,organization_id,created_at,updated_at,purchases:purchases!fk_purchases_supplier(count)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
    }

    const row = supplier as unknown as SupplierRow
    const ci = (row as any).contact_info || {}
    const purchasesCount = Array.isArray((row as any).purchases)
      ? Number((row as any).purchases?.[0]?.count ?? 0)
      : 0

    const mappedSupplier = {
      id: row.id,
      name: row.name,
      category: String(ci.category || 'General'),
      status: row.is_active ? 'active' : 'inactive',
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      _count: { purchases: purchasesCount },
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

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const { data: existing, error: existingError } = await supabase
      .from('suppliers')
      .select('id,contact_info,organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    const contactInfo = body.contactInfo || {}
    const prev = (existing as any).contact_info || {}
    const nextContact = {
      ...prev,
      email: contactInfo.email ?? prev.email ?? null,
      phone: contactInfo.phone ?? prev.phone ?? null,
      address: contactInfo.address ?? prev.address ?? null,
      contactPerson: contactInfo.contactPerson ?? prev.contactPerson ?? null,
      website: contactInfo.website ?? prev.website ?? null,
      taxId: body.taxId ?? prev.taxId ?? null,
      notes: body.notes ?? prev.notes ?? null,
      commercialConditions: body.commercialConditions ?? prev.commercialConditions ?? null,
      category: body.category ?? prev.category ?? null,
      rating: body.rating ?? prev.rating ?? null,
    }

    const dbData: Record<string, unknown> = {
      contact_info: nextContact,
    }
    if (body.name !== undefined) dbData.name = body.name
    if (body.status !== undefined) dbData.is_active = body.status === 'active'

    const { data, error } = await supabase
      .from('suppliers')
      .update(dbData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
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

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const { count: purchasesCount } = await supabase
      .from('purchases')
      .select('id', { count: 'estimated', head: true })
      .eq('organization_id', orgId)
      .eq('supplier_id', id)

    if ((purchasesCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Proveedor con compras asociadas', purchases: purchasesCount },
        { status: 409 }
      )
    }

    const { count: productsCount } = await supabase
      .from('products')
      .select('id', { count: 'estimated', head: true })
      .eq('organization_id', orgId)
      .eq('supplier_id', id)

    if ((productsCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Proveedor con productos asociados', products: productsCount },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)

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
