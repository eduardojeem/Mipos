import { NextRequest, NextResponse } from 'next/server'
import { store, type MediaFile } from '../_store'

function parseDate(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const searchTerm = searchParams.get('searchTerm') || ''
  const fileType = searchParams.get('fileType') || 'all'
  const folder = searchParams.get('folder') || 'all'
  const sortBy = (searchParams.get('sortBy') as 'title' | 'date' | 'size') || 'date'
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  const from = parseDate(searchParams.get('from'))
  const to = parseDate(searchParams.get('to'))

  let filtered = store.media

  if (searchTerm) {
    const st = searchTerm.toLowerCase()
    filtered = filtered.filter(f =>
      f.originalName.toLowerCase().includes(st) ||
      (f.tags || []).some((t: string) => t.toLowerCase().includes(st))
    )
  }

  if (fileType !== 'all') {
    filtered = filtered.filter(file => {
      if (fileType === 'images') return file.mimeType.startsWith('image/')
      if (fileType === 'documents') return file.mimeType.includes('pdf') || file.mimeType.includes('doc')
      if (fileType === 'videos') return file.mimeType.startsWith('video/')
      return true
    })
  }

  if (folder !== 'all') {
    filtered = filtered.filter(f => f.folder === folder)
  }

  if (from || to) {
    filtered = filtered.filter(f => {
      const d = new Date(f.createdAt)
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }

  filtered.sort((a, b) => {
    let av = 0 as any
    let bv = 0 as any
    if (sortBy === 'title') {
      av = a.originalName.toLowerCase()
      bv = b.originalName.toLowerCase()
    } else if (sortBy === 'size') {
      av = a.size
      bv = b.size
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
  const file: MediaFile = {
    id,
    filename: body.filename || `file-${id.slice(0,8)}`,
    originalName: body.originalName || body.filename || `Archivo ${id.slice(0,8)}`,
    mimeType: body.mimeType || 'application/octet-stream',
    size: Number(body.size ?? 0),
    url: body.url || '',
    thumbnailUrl: body.thumbnailUrl || undefined,
    alt: body.alt || undefined,
    caption: body.caption || undefined,
    folder: body.folder || 'general',
    tags: Array.isArray(body.tags) ? body.tags : [],
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  store.media.unshift(file)
  return NextResponse.json({ success: true, data: file })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, updates } = body || {}
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const idx = store.media.findIndex(m => m.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = { ...store.media[idx], ...updates, updatedAt: new Date().toISOString() }
  store.media[idx] = updated
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { id, ids } = body || {}
  const toDelete: string[] = ids || (id ? [id] : [])
  if (toDelete.length === 0) return NextResponse.json({ error: 'Missing id(s)' }, { status: 400 })
  store.media = store.media.filter(m => !toDelete.includes(m.id))
  return NextResponse.json({ success: true, deleted: toDelete })
}
