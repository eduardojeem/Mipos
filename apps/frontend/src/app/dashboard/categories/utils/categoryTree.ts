import type { CategoryWithCount, StatusFilter } from '../hooks/useCategoryManagement'

export type CategoryTreeNode = CategoryWithCount & { children: CategoryTreeNode[] }

function normalizeParentId(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s : null
}

export function buildCategoryTree(categories: CategoryWithCount[]): CategoryTreeNode[] {
  const byId = new Map<string, CategoryTreeNode>()
  const childrenByParent = new Map<string | null, string[]>()

  for (const c of categories) {
    byId.set(c.id, { ...(c as any), children: [] })
    const p = normalizeParentId((c as any).parent_id)
    const arr = childrenByParent.get(p) || []
    arr.push(c.id)
    childrenByParent.set(p, arr)
  }

  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => {
      const na = byId.get(a)?.name || ''
      const nb = byId.get(b)?.name || ''
      return na.localeCompare(nb)
    })
  }

  const roots: CategoryTreeNode[] = []
  const visited = new Set<string>()

  const attach = (id: string, path: Set<string>): CategoryTreeNode | null => {
    const node = byId.get(id)
    if (!node) return null
    if (path.has(id)) return null
    if (visited.has(id)) return node

    visited.add(id)
    const nextPath = new Set(path)
    nextPath.add(id)
    const childIds = childrenByParent.get(id) || []
    node.children = childIds
      .map((cid) => attach(cid, nextPath))
      .filter(Boolean) as CategoryTreeNode[]
    return node
  }

  const rootIds = childrenByParent.get(null) || []
  for (const rid of rootIds) {
    const n = attach(rid, new Set())
    if (n) roots.push(n)
  }

  for (const [id] of byId.entries()) {
    if (visited.has(id)) continue
    const n = attach(id, new Set())
    if (n) roots.push(n)
  }

  roots.sort((a, b) => a.name.localeCompare(b.name))
  return roots
}

export function flattenCategoryTree(
  nodes: CategoryTreeNode[],
  expandedIds: Set<string>,
  level = 0
): Array<{ node: CategoryTreeNode; level: number }> {
  const out: Array<{ node: CategoryTreeNode; level: number }> = []
  for (const n of nodes) {
    out.push({ node: n, level })
    if (expandedIds.has(n.id) && n.children.length > 0) {
      out.push(...flattenCategoryTree(n.children, expandedIds, level + 1))
    }
  }
  return out
}

export function getDescendantIds(categories: CategoryWithCount[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>()
  for (const c of categories) {
    const p = normalizeParentId((c as any).parent_id)
    if (!p) continue
    const arr = childrenByParent.get(p) || []
    arr.push(c.id)
    childrenByParent.set(p, arr)
  }

  const out = new Set<string>()
  const queue: string[] = [rootId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const cur = queue.shift() as string
    if (visited.has(cur)) continue
    visited.add(cur)
    const kids = childrenByParent.get(cur) || []
    for (const k of kids) {
      if (!out.has(k)) out.add(k)
      queue.push(k)
    }
  }

  return out
}

export function getVisibleIdsForTreeSearch(
  categories: CategoryWithCount[],
  search: string,
  status: StatusFilter
): { visibleIds: Set<string>; autoExpandedIds: Set<string> } {
  const q = search.trim().toLowerCase()
  const byId = new Map<string, CategoryWithCount>()
  const parentById = new Map<string, string | null>()
  for (const c of categories) {
    byId.set(c.id, c)
    parentById.set(c.id, normalizeParentId((c as any).parent_id))
  }

  const matches = new Set<string>()
  for (const c of categories) {
    if (status === 'active' && !c.is_active) continue
    if (status === 'inactive' && c.is_active) continue
    if (!q) {
      matches.add(c.id)
      continue
    }
    const hay = `${c.name || ''} ${c.description || ''}`.toLowerCase()
    if (hay.includes(q)) matches.add(c.id)
  }

  const visibleIds = new Set<string>()
  const autoExpandedIds = new Set<string>()

  const addAncestors = (id: string) => {
    let cur: string | null = id
    const guard = new Set<string>()
    while (cur) {
      if (guard.has(cur)) break
      guard.add(cur)
      visibleIds.add(cur)
      const p = parentById.get(cur) || null
      if (p) autoExpandedIds.add(p)
      cur = p
    }
  }

  for (const id of matches) {
    if (!byId.has(id)) continue
    addAncestors(id)
  }

  return { visibleIds, autoExpandedIds }
}

