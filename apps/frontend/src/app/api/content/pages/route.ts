import { NextRequest, NextResponse } from 'next/server'
import { store, type WebPage } from '../_store'

function parseBool(value: string | null) {
  if (!value) return null
  const v = value.toLowerCase()
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

function parseDate(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get('searchTerm') || ''
  const status = searchParams.get('status') || 'all'
  const category = searchParams.get('category') || 'all'
  const sortBy = (searchParams.get('sortBy') as 'title' | 'date' | 'views') || 'date'
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  const from = parseDate(searchParams.get('from'))
  const to = parseDate(searchParams.get('to'))

  let filtered = store.pages

  if (searchTerm) {
    const st = searchTerm.toLowerCase()
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(st) ||
      p.content.toLowerCase().includes(st) ||
      (p.tags || []).some((t: string) => t.toLowerCase().includes(st))
    )
  }

  if (status !== 'all') {
    filtered = filtered.filter(p => status === 'published' ? p.isPublished : !p.isPublished)
  }

  if (category !== 'all') {
    filtered = filtered.filter(p => p.category === category)
  }

  if (from || to) {
    filtered = filtered.filter(p => {
      const d = new Date(p.updatedAt)
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
      av = a.viewCount
      bv = b.viewCount
    } else {
      av = new Date(a.updatedAt).getTime()
      bv = new Date(b.updatedAt).getTime()
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
  const page: WebPage = {
    id,
    title: body.title || 'Sin título',
    slug: body.slug || `pagina-${id.slice(0,8)}`,
    content: body.content || '',
    metaDescription: body.metaDescription || '',
    metaKeywords: body.metaKeywords || '',
    isPublished: !!body.isPublished,
    publishedAt: body.isPublished ? now : undefined,
    version: 1,
    authorId: body.authorId || 'user-1',
    authorName: body.authorName || 'Admin Usuario',
    category: body.category || 'Principal',
    tags: Array.isArray(body.tags) ? body.tags : [],
    viewCount: 0,
    seoScore: body.seoScore ?? 70,
    createdAt: now,
    updatedAt: now,
  }
  store.pages.unshift(page)
  return NextResponse.json({ success: true, data: page })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, updates } = body || {}
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const idx = store.pages.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = { ...store.pages[idx], ...updates, updatedAt: new Date().toISOString() }
  store.pages[idx] = updated
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { id, ids } = body || {}
  const toDelete: string[] = ids || (id ? [id] : [])
  if (toDelete.length === 0) return NextResponse.json({ error: 'Missing id(s)' }, { status: 400 })
  store.pages = store.pages.filter(p => !toDelete.includes(p.id))
  return NextResponse.json({ success: true, deleted: toDelete })
}
