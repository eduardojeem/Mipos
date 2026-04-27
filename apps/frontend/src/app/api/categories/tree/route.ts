import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'

type Row = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  parent_id: string | null
  created_at: string
  updated_at: string
  products?: Array<{ count: number }>
}

type Node = {
  id: string
  name: string
  description: string
  is_active: boolean
  parent_id: string | null
  created_at: string
  updated_at: string
  _count: { products: number }
  children: Node[]
}

function normalizeParentId(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s : null
}

function buildTree(rows: Row[]): Node[] {
  const byId = new Map<string, Node>()
  const childrenByParent = new Map<string | null, string[]>()

  for (const r of rows) {
    const productsCount = Array.isArray((r as any).products)
      ? Number((r as any).products?.[0]?.count ?? 0)
      : Number((r as any).products?.count ?? 0)

    byId.set(r.id, {
      id: r.id,
      name: r.name,
      description: r.description || '',
      is_active: r.is_active,
      parent_id: normalizeParentId(r.parent_id),
      created_at: r.created_at,
      updated_at: r.updated_at,
      _count: { products: Number.isFinite(productsCount) ? productsCount : 0 },
      children: [],
    })

    const p = normalizeParentId(r.parent_id)
    const arr = childrenByParent.get(p) || []
    arr.push(r.id)
    childrenByParent.set(p, arr)
  }

  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => {
      const na = byId.get(a)?.name || ''
      const nb = byId.get(b)?.name || ''
      return na.localeCompare(nb)
    })
  }

  const roots: Node[] = []
  const visited = new Set<string>()

  const attach = (id: string, path: Set<string>): Node | null => {
    const node = byId.get(id)
    if (!node) return null
    if (path.has(id)) return null
    if (visited.has(id)) return node

    visited.add(id)
    const nextPath = new Set(path)
    nextPath.add(id)
    const directChildrenIds = childrenByParent.get(id) || []
    node.children = directChildrenIds
      .map((cid) => attach(cid, nextPath))
      .filter(Boolean) as Node[]
    return node
  }

  const rootIds = childrenByParent.get(null) || []
  for (const rid of rootIds) {
    const n = attach(rid, new Set())
    if (n) roots.push(n)
  }

  for (const [id, n] of byId.entries()) {
    if (visited.has(id)) continue
    const orphan = attach(id, new Set())
    if (orphan) roots.push(orphan)
  }

  roots.sort((a, b) => a.name.localeCompare(b.name))
  return roots
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canQuery = canUseSupabase && !!user && !userError
    if (!canQuery) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || '').trim().toLowerCase()

    let query = (supabase as any)
      .from('categories')
      .select(
        'id,name,description,is_active,parent_id,created_at,updated_at,products:products!products_category_id_fkey(count)',
        { count: 'exact' }
      )
      .eq('organization_id', orgId)

    if (status === 'active') query = query.eq('is_active', true)
    if (status === 'inactive') query = query.eq('is_active', false)

    const { data, error } = await query.order('name', { ascending: true })
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch categories', details: error.message }, { status: 500 })
    }

    const rows = (data || []) as Row[]
    const nodes = buildTree(rows)

    return NextResponse.json({ success: true, nodes })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
