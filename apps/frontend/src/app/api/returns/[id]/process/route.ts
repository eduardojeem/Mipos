import { NextRequest, NextResponse } from 'next/server'

function backendBase() {
  const base = process.env.BACKEND_URL || ''
  return base.replace(/\/$/, '')
}

function forwardHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const auth = req.headers.get('authorization')
  const org = req.headers.get('x-organization-id')
  if (auth) headers['authorization'] = auth
  if (org) headers['x-organization-id'] = org
  return headers
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const base = backendBase()
    if (!base) return NextResponse.json({ error: 'BACKEND_URL no configurado' }, { status: 500 })
    const res = await fetch(`${base}/returns/${params.id}/status`, {
      method: 'PATCH',
      headers: forwardHeaders(request),
      body: JSON.stringify({ status: 'COMPLETED' })
    })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to process return' }, { status: 500 })
  }
}

