import { NextRequest, NextResponse } from 'next/server'

function buildAuthHeaders() {
  const headers: Record<string, string> = {}
  const apiKey = process.env.EXTERNAL_SAAS_API_KEY
  const bearer = process.env.EXTERNAL_SAAS_BEARER_TOKEN
  const basicUser = process.env.EXTERNAL_SAAS_BASIC_USER
  const basicPass = process.env.EXTERNAL_SAAS_BASIC_PASS

  if (apiKey) headers['x-api-key'] = apiKey
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`
  if (basicUser && basicPass) {
    const b64 = Buffer.from(`${basicUser}:${basicPass}`).toString('base64')
    headers['Authorization'] = `Basic ${b64}`
  }
  return headers
}

export async function POST(request: NextRequest, { params }: { params: { entity: string } }) {
  try {
    const base = process.env.EXTERNAL_SAAS_BASE_URL?.replace(/\/$/, '')
    if (!base) {
      return NextResponse.json({ error: 'EXTERNAL_SAAS_BASE_URL no configurado' }, { status: 500 })
    }

    const entity = String(params.entity || '').replace(/^\//, '')
    const url = `${base}/${entity}`
    const body = await request.json()

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 })
  }
}

