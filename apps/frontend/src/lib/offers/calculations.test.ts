import { describe, it, expect } from 'vitest'
import { calculateOfferPrice, validatePromotion, getBestOffer, type Promotion } from './calculations'

describe('offers/calculations', () => {
  it('calculates percentage discount within bounds', () => {
    const promo: Promotion = { id: 'p', name: '20%', discountType: 'PERCENTAGE', discountValue: 20, isActive: true }
    const res = calculateOfferPrice(100, promo)
    expect(res.offerPrice).toBe(80)
    expect(res.discountPercent).toBe(20)
    expect(res.savings).toBe(20)
  })

  it('caps percentage > 100 to 100', () => {
    const promo: Promotion = { id: 'p', name: '>100%', discountType: 'PERCENTAGE', discountValue: 150, isActive: true }
    const res = calculateOfferPrice(50, promo)
    expect(res.offerPrice).toBe(0)
    expect(res.discountPercent).toBe(100)
    expect(res.savings).toBe(50)
  })

  it('calculates fixed amount and respects maxDiscountAmount', () => {
    const promo: Promotion = { id: 'p', name: 'Fixed 30', discountType: 'FIXED_AMOUNT', discountValue: 30, isActive: true, maxDiscountAmount: 20 }
    const res = calculateOfferPrice(100, promo)
    expect(res.offerPrice).toBe(80)
    expect(res.effectiveDiscountValue).toBe(20)
    expect(res.discountPercent).toBe(20)
  })

  it('BOGO applies 50% discount', () => {
    const promo: Promotion = { id: 'p', name: 'BOGO', discountType: 'BOGO', isActive: true }
    const res = calculateOfferPrice(200, promo)
    expect(res.offerPrice).toBe(100)
    expect(res.discountPercent).toBe(50)
    expect(res.savings).toBe(100)
  })

  it('FREE_SHIPPING does not change product price', () => {
    const promo: Promotion = { id: 'p', name: 'Ship', discountType: 'FREE_SHIPPING', isActive: true }
    const res = calculateOfferPrice(99.99, promo)
    expect(res.offerPrice).toBe(99.99)
    expect(res.discountPercent).toBe(0)
    expect(res.savings).toBe(0)
  })

  it('validatePromotion detects active, upcoming and expired', () => {
    const now = Date.now()
    const active: Promotion = { id: 'a', name: 'Active', discountType: 'PERCENTAGE', discountValue: 10, isActive: true, startDate: new Date(now - 3600_000).toISOString(), endDate: new Date(now + 3600_000).toISOString() }
    const upcoming: Promotion = { ...active, id: 'u', startDate: new Date(now + 24*3600_000).toISOString() }
    const expired: Promotion = { ...active, id: 'e', endDate: new Date(now - 3600_000).toISOString() }
    const vActive = validatePromotion(active)
    const vUpcoming = validatePromotion(upcoming)
    const vExpired = validatePromotion(expired)
    expect(vActive.isActive).toBe(true)
    expect(vActive.isValid).toBe(true)
    expect(vUpcoming.isUpcoming).toBe(true)
    expect(vUpcoming.isActive).toBe(false)
    expect(vExpired.isExpired).toBe(true)
    expect(vExpired.isActive).toBe(false)
  })

  it('validatePromotion errors when startDate >= endDate and usage limit reached', () => {
    const now = Date.now()
    const bad: Promotion = { id: 'b', name: 'Bad', discountType: 'PERCENTAGE', discountValue: 10, isActive: true, startDate: new Date(now + 10_000).toISOString(), endDate: new Date(now).toISOString(), usageLimit: 10, usageCount: 10 }
    const v = validatePromotion(bad)
    expect(v.errors.length).toBeGreaterThan(0)
    expect(v.isValid).toBe(false)
  })

  it('getBestOffer returns promotion with lowest offerPrice', () => {
    const promos: Promotion[] = [
      { id: 'p1', name: '10%', discountType: 'PERCENTAGE', discountValue: 10, isActive: true },
      { id: 'p2', name: 'Fixed 30', discountType: 'FIXED_AMOUNT', discountValue: 30, isActive: true },
    ]
    const best = getBestOffer(100, promos)
    expect(best.offerPrice).toBe(70)
    expect(best.promotion?.id).toBe('p2')
  })
})

