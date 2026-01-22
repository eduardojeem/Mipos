import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../index'

vi.mock('@/lib/api', () => {
  const get = vi.fn(async (_url: string) => {
    const data = [
      { id: 'a1', name: 'Promo A', description: '', discountType: 'PERCENTAGE', discountValue: 10, startDate: new Date().toISOString(), endDate: new Date(Date.now()+86400000).toISOString(), isActive: true, usageCount: 0, applicableProducts: [] },
      { id: 'b2', name: 'Promo B', description: '', discountType: 'FIXED_AMOUNT', discountValue: 5000, startDate: new Date().toISOString(), endDate: new Date(Date.now()+86400000).toISOString(), isActive: true, usageCount: 0, applicableProducts: [] }
    ]
    return { data: { success: true, data } }
  })
  return { default: { get } }
})

describe('promotions store', () => {
  beforeEach(() => {
    useStore.getState().clear()
    useStore.setState({ items: [], loading: false, error: undefined })
  })

  it('fetches and caches promotions', async () => {
    await useStore.getState().fetchPromotions()
    const first = useStore.getState().items
    expect(first.length).toBe(2)

    const before = Date.now()
    await useStore.getState().fetchPromotions()
    const second = useStore.getState().items
    expect(second.length).toBe(2)
    expect(Date.now() - before).toBeLessThan(50)
  })
})