import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')
  const excludeId = searchParams.get('excludeId')

  if (!name) {
    return NextResponse.json({ message: 'Nombre es requerido' }, { status: 400 })
  }

  try {
    const supabase = await createAdminClient()
    
    let query = supabase
      .from('roles')
      .select('id')
      .eq('name', name.toUpperCase())

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) throw error

    const isUnique = !data || data.length === 0

    return NextResponse.json({ isUnique })
  } catch (error: any) {
    console.error('Error validating role name:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}