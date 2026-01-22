import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase.from('permissions').select('*')
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const permissions = (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    displayName: p.display_name,
    resource: p.resource,
    action: p.action,
    description: p.description,
    category: p.resource,
    isSystem: false,
    createdAt: p.created_at
  }))

  return NextResponse.json(permissions)
}
