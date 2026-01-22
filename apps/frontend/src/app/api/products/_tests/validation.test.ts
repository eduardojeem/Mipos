import { describe, it, expect } from 'vitest'
import { validateCreate, validateUpdate, validateDelete, validateQuery } from '../_utils/validation'

describe('product validation', () => {
  it('validates create payload', () => {
    const res = validateCreate({ name: 'AB', sku: 'SKU1', category_id: 'cat', sale_price: 10 })
    expect(res.success).toBe(true)
  })
  it('rejects invalid price', () => {
    const res = validateCreate({ name: 'A', sku: 'S', category_id: 'c', sale_price: -1 })
    expect(res.success).toBe(false)
  })
  it('validates update partial', () => {
    const res = validateUpdate({ sale_price: 20 })
    expect(res.success).toBe(true)
  })
  it('validates delete ids', () => {
    const res = validateDelete({ ids: ['1','2'] })
    expect(res.success).toBe(true)
  })
  it('validates query params', () => {
    const sp = new URLSearchParams({ page: '1', pageSize: '25', sortBy: 'name', sortDirection: 'asc' })
    const res = validateQuery(sp)
    expect(res.success).toBe(true)
  })
})
