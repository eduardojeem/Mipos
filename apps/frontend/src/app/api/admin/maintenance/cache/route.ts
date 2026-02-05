import { NextRequest, NextResponse } from 'next/server'
import { apiCache } from '@/lib/api-cache'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(req: NextRequest) {
  const auth = await assertAdmin(req)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  return NextResponse.json({
    success: true,
    stats: apiCache.getStats()
  })
}

export async function DELETE(req: NextRequest) {
  const auth = await assertAdmin(req)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  apiCache.clear()

  return NextResponse.json({
    success: true,
    message: 'Caché limpiado exitosamente',
    stats: apiCache.getStats()
  })
}
