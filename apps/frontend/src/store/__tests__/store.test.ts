import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore, type RootState } from '../index'
import api from '@/lib/api'

function getState() {
  return useStore.getState() as RootState
}

describe('Zustand Root Store', () => {
  beforeEach(() => {
    // reset store slices to known baseline
    useStore.setState({ isMobile: false, entries: {}, items: [], loading: false, error: undefined })
  })

  it('updates app.isMobile immutably and typed', () => {
    const before = getState()
    expect(before.isMobile).toBe(false)
    useStore.getState().setIsMobile(true)
    const after = getState()
    expect(after.isMobile).toBe(true)
    expect(after).not.toBe(before)
  })

  it('sets and retrieves cache with TTL', () => {
    const key = 'test:key'
    useStore.getState().setCache(key, { a: 1 }, 1000)
    const cached = useStore.getState().getCache<{ a: number }>(key)
    expect(cached?.a).toBe(1)
  })

  it('invalidates cache entry', () => {
    const key = 'to:invalidate'
    useStore.getState().setCache(key, { v: 2 }, 1000)
    useStore.getState().invalidate(key)
    const cached = useStore.getState().getCache(key)
    expect(cached).toBeUndefined()
  })

  it('fetchPromotions populates items and caches response', async () => {
    const key = 'promotions:list:{}'
    // Mock API GET
    vi.spyOn(api, 'get').mockResolvedValue({
      // @ts-expect-error simplify response shape for test
      data: [{ id: 'p1', name: 'A', discountType: 'PERCENTAGE', discountValue: 10, startDate: '2025-01-01', endDate: '2025-12-31', isActive: true }]
    })
    await useStore.getState().fetchPromotions()
    const state = getState()
    expect(state.items.length).toBe(1)
    const cached = state.getCache(key)
    expect(Array.isArray(cached)).toBe(true)
  })
})