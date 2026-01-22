import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { assertCsrf } from '@/app/api/_utils/csrf'
import { cleanupExpired } from '@/app/api/admin/_services/sessions'

export async function POST(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }
  const csrf = assertCsrf(request)
  if (!csrf.ok) return csrf.response

  const res = await cleanupExpired()
  return NextResponse.json(res)
}