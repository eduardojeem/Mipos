import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { assertCsrf } from '@/app/api/_utils/csrf'
import { terminateSession } from '@/app/api/admin/_services/sessions'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar acceso de administrador
  const auth = await assertAdmin(req)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }
  const csrf = assertCsrf(req)
  if (!csrf.ok) return csrf.response

  const { id } = await params
  const result = await terminateSession(id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json({ ok: true, terminated: id })
}