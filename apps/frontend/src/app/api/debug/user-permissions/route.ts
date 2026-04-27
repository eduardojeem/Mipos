import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

type MemberInfo = {
  organization: { id: string; name: string | null; slug: string | null }
  role: { id: string; name: string | null } | null
  is_owner: boolean
}

export async function GET(request: NextRequest) {
  try {
    const admin = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const email = (searchParams.get('email') || 'analiak026@gmail.com').trim().toLowerCase()

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (userErr) {
      return NextResponse.json({ success: false, error: `Error buscando usuario: ${userErr.message}` }, { status: 500 })
    }
    if (!userRow) {
      return NextResponse.json({ success: false, error: `No existe usuario con email ${email}` }, { status: 404 })
    }

    const userId = userRow.id as string

    // Obtener membresías del usuario
    const { data: memberships, error: memErr } = await admin
      .from('organization_members')
      .select('organization_id, role_id, is_owner')
      .eq('user_id', userId)

    if (memErr) {
      return NextResponse.json({ success: false, error: `Error leyendo membresías: ${memErr.message}` }, { status: 500 })
    }

    const orgIds = Array.from(new Set((memberships || []).map((m: any) => m.organization_id).filter(Boolean)))
    const roleIds = Array.from(new Set((memberships || []).map((m: any) => m.role_id).filter(Boolean)))

    const [{ data: orgs }, { data: roles }] = await Promise.all([
      admin.from('organizations').select('id, name, slug').in('id', orgIds),
      admin.from('roles').select('id, name').in('id', roleIds),
    ])

    const roleById = (roles || []).reduce((acc: Record<string, { id: string; name: string | null }>, r: any) => {
      acc[r.id] = { id: r.id, name: r.name }
      return acc
    }, {})
    const orgById = (orgs || []).reduce((acc: Record<string, { id: string; name: string | null; slug: string | null }>, o: any) => {
      acc[o.id] = { id: o.id, name: o.name, slug: o.slug }
      return acc
    }, {})

    const details: MemberInfo[] = (memberships || []).map((m: any) => ({
      organization: orgById[m.organization_id] || { id: m.organization_id, name: null, slug: null },
      role: roleById[m.role_id] || null,
      is_owner: Boolean(m.is_owner),
    }))

    const paravos = details.find((d) => d.organization.slug === 'paravoscosmeticos-1773613448825') || null

    return NextResponse.json({
      success: true,
      data: {
        user: { id: userId, email },
        memberships: details,
        focus: {
          paravos,
          can_view_paravos: Boolean(paravos && (paravos.is_owner || (paravos.role?.name || '').toUpperCase() === 'ADMIN')),
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}

