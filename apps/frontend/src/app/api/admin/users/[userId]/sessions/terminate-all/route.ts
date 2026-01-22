import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/app/api/admin/_utils/audit'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await assertAdmin(req)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }
  // Mock: no-op. En backend real, cerraría todas las sesiones del usuario.
  const { userId } = await params
  logAudit('sessions.terminate_all', { userId })
  return NextResponse.json({ ok: true, terminatedAllForUser: userId })
}