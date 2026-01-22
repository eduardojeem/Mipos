import { NextRequest, NextResponse } from 'next/server'
import { store, type Banner } from '../_store'

function parseDate(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get('searchTerm') || ''
  const status = searchParams.get('status') || 'all'
  const position = searchParams.get('position') || 'all'
  const sortBy = (searchParams.get('sortBy') as 'title' | 'date' | 'views') || 'date'
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  const from = parseDate(searchParams.get('from'))
  const to = parseDate(searchParams.get('to'))

  let filtered = store.banners

  if (searchTerm) {
    const st = searchTerm.toLowerCase()
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(st) ||
      b.description.toLowerCase().includes(st)
    )
  }

  if (status !== 'all') {
    filtered = filtered.filter(b => status === 'active' ? b.isActive : !b.isActive)
  }

  if (position !== 'all') {
    filtered = filtered.filter(b => b.position === position)
  }

  if (from || to) {
    filtered = filtered.filter(b => {
      const d = new Date(b.createdAt)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }

  filtered.sort((a, b) => {
    let av = 0 as any
    let bv = 0 as any
    if (sortBy === 'title') {
      av = a.title.toLowerCase()
      bv = b.title.toLowerCase()
    } else if (sortBy === 'views') {
      av = a.impressionCount
      bv = b.impressionCount
    } else {
      av = new Date(a.createdAt).getTime()
      bv = new Date(b.createdAt).getTime()
    }
    if (av < bv) return sortOrder === 'asc' ? -1 : 1
    if (av > bv) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  return NextResponse.json({ data: filtered })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const banner: Banner = {
    id,
    title: body.title || 'Sin título',
    description: body.description || '',
    imageUrl: body.imageUrl || '',
    linkUrl: body.linkUrl || undefined,
    position: body.position || 'HERO',
    isActive: !!body.isActive,
    order: Number(body.order ?? 1),
    startDate: body.startDate || undefined,
    endDate: body.endDate || undefined,
    targetAudience: Array.isArray(body.targetAudience) ? body.targetAudience : [],
    clickCount: 0,
    impressionCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  store.banners.unshift(banner)
  return NextResponse.json({ success: true, data: banner })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, updates } = body || {}
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const idx = store.banners.findIndex(b => b.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = { ...store.banners[idx], ...updates, updatedAt: new Date().toISOString() }
  store.banners[idx] = updated
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { id, ids } = body || {}
  const toDelete: string[] = ids || (id ? [id] : [])
  if (toDelete.length === 0) return NextResponse.json({ error: 'Missing id(s)' }, { status: 400 })
  store.banners = store.banners.filter(b => !toDelete.includes(b.id))
  return NextResponse.json({ success: true, deleted: toDelete })
}
