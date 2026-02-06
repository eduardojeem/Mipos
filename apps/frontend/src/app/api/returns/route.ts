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

export async function GET(request: NextRequest) {
  try {
    const base = backendBase()
    if (!base) return NextResponse.json({ returns: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } })
    const url = new URL(request.url)
    const qs = url.search
    const res = await fetch(`${base}/returns${qs}`, { headers: forwardHeaders(request) })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch returns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const base = backendBase()
    if (!base) return NextResponse.json({ error: 'BACKEND_URL no configurado' }, { status: 500 })
    const body = await request.json()
    const res = await fetch(`${base}/returns`, { method: 'POST', headers: forwardHeaders(request), body: JSON.stringify(body) })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create return' }, { status: 500 })
  }
}

