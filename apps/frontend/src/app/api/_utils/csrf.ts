import { NextRequest, NextResponse } from 'next/server'

export function assertCsrf(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const header = req.headers.get('x-csrf-token')?.trim()
  const cookie = req.cookies.get('csrf-token')?.value?.trim()
  const secret = process.env.CSRF_SECRET?.trim()

  const host = req.headers.get('host') || ''
  const origin = req.headers.get('origin') || ''
  const sameOrigin = origin === '' || origin.includes(host)

  const validToken = Boolean(
    header && ((secret && header === secret) || (cookie && header === cookie))
  )

  if (!sameOrigin || !validToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid CSRF token or cross-origin request' },
        { status: 403 }
      ),
    }
  }
  return { ok: true }
}