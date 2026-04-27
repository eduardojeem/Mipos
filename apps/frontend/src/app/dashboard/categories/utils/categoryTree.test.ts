import { describe, expect, it } from 'vitest'
import type { CategoryWithCount } from '../hooks/useCategoryManagement'
import { buildCategoryTree, getDescendantIds, getVisibleIdsForTreeSearch } from './categoryTree'

function c(
  id: string,
  name: string,
  parent_id: string | null,
  is_active = true
): CategoryWithCount {
  return {
    id,
    name,
    description: '',
    is_active,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    parent_id,
    _count: { products: 0 },
  }
}

describe('categoryTree utils', () => {
  it('builds a tree from parent_id', () => {
    const categories = [
      c('a', 'A', null),
      c('b', 'B', 'a'),
      c('c', 'C', 'a'),
      c('d', 'D', 'b'),
    ]
    const tree = buildCategoryTree(categories)
    expect(tree.map((n) => n.id)).toEqual(['a'])
    expect(tree[0].children.map((n) => n.id)).toEqual(['b', 'c'])
    expect(tree[0].children[0].children.map((n) => n.id)).toEqual(['d'])
  })

  it('computes descendants', () => {
    const categories = [
      c('a', 'A', null),
      c('b', 'B', 'a'),
      c('c', 'C', 'a'),
      c('d', 'D', 'b'),
    ]
    const desc = getDescendantIds(categories, 'a')
    expect(Array.from(desc).sort()).toEqual(['b', 'c', 'd'])
  })

  it('keeps ancestors visible when searching', () => {
    const categories = [
      c('root', 'Raiz', null),
      c('child', 'Child', 'root'),
      c('leaf', 'Leaf Match', 'child'),
    ]
    const { visibleIds } = getVisibleIdsForTreeSearch(categories, 'match', 'all')
    expect(visibleIds.has('leaf')).toBe(true)
    expect(visibleIds.has('child')).toBe(true)
    expect(visibleIds.has('root')).toBe(true)
  })
})

