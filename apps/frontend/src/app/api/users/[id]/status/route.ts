import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isMockAuthEnabled } from '@/lib/env'
import { assertAdmin } from '@/app/api/_utils/auth'

type Status = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertAdmin(request)
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status })
    }
    const { id: userId } = await params
    const body = await request.json()
    const status: Status = body?.status

    if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    // Mock mode: responder sin tocar datos reales
    if (isMockAuthEnabled()) {
      const now = new Date().toISOString()
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Usuario Mock',
        role: status === 'INACTIVE' ? 'INACTIVE' : 'EMPLOYEE',
        status: status.toLowerCase(),
        createdAt: now,
        lastLogin: now,
      }
      return NextResponse.json({ success: true, user: mockUser })
    }

    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario solicitante sea admin (tabla users si existe, fallback metadata)
    let requesterRole = 'VIEWER'
    try {
      const { data: profile } = await (supabase as any)
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      requesterRole = (((profile as any)?.role || (user as any)?.user_metadata?.role || 'VIEWER') as string).toUpperCase()
    } catch {
      requesterRole = (((user as any)?.user_metadata?.role || 'VIEWER') as string).toUpperCase()
    }

    if (requesterRole !== 'ADMIN' && requesterRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Cliente admin para evitar RLS
    let admin: any
    try {
      admin = createAdminClient()
    } catch (e) {
      console.error('Supabase admin client no configurado:', e)
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    // Verificar que el usuario destino existe
    const { data: existingUser, error: existingError } = await admin
      .from('users')
      .select('id, email, full_name, role, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (existingError || !existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Determinar rol a setear según estado
    const nextRole = status === 'INACTIVE' ? 'INACTIVE' : 'EMPLOYEE'

    // Intentar actualizar status (si la columna existe) junto con role
    let updatedRow: any | null = null
    const tryUpdateWithStatus = async () => {
      const { data, error } = await admin
        .from('users')
        .update({ role: nextRole, status, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    }

    const tryUpdateRoleOnly = async () => {
      const { data, error } = await admin
        .from('users')
        .update({ role: nextRole, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    }

    try {
      updatedRow = await tryUpdateWithStatus()
    } catch (e) {
      console.warn('Columna status puede no existir, actualizando solo role.')
      updatedRow = await tryUpdateRoleOnly()
    }

    // Nota: En una implementación completa, aquí podríamos aplicar suspensión en Auth
    // usando banned_until. Para mantener estabilidad, se omite.

    const responseUser = {
      id: updatedRow.id,
      email: updatedRow.email,
      name: updatedRow.full_name || existingUser.full_name,
      role: updatedRow.role,
      status: (updatedRow.status || status).toString().toLowerCase(),
      createdAt: updatedRow.created_at || existingUser.created_at,
      lastLogin: updatedRow.updated_at || updatedRow.created_at || existingUser.updated_at || existingUser.created_at,
    }

    return NextResponse.json({ success: true, user: responseUser })
  } catch (error) {
    console.error('Error en API de estado de usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
