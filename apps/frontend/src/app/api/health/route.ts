import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const payload = {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(payload, { status: 200 })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// Accept POST for latency checks performed by connection monitor
export async function POST(_request: NextRequest) {
  try {
    const payload = {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json(payload, { status: 200 })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}