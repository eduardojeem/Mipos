import { describe, it, expect } from 'vitest'
import { __makeSafeUpdates } from '../supabase-realtime'

describe('makeSafeUpdates', () => {
  it('keeps wholesale_price and removes offer_price', () => {
    const safe = __makeSafeUpdates({ wholesale_price: 99, offer_price: 10 })
    expect(safe.wholesale_price).toBe(99)
    expect(safe.offer_price).toBeUndefined()
    expect(safe.offer_price).toBeUndefined()
  })
})