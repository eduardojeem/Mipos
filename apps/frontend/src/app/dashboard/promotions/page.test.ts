import { describe, it, expect } from 'vitest'
import { getPromotionStatus, paginate, sortPromotions, impactLevel } from './utils'

const basePromotion = {
  id: 'p1',
  name: 'Promo',
  description: '',
  discountType: 'PERCENTAGE' as const,
  discountValue: 10,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 24*60*60*1000).toISOString(),
  isActive: true,
  minPurchaseAmount: 0,
  maxDiscountAmount: 0,
  usageLimit: 0,
  usageCount: 0,
  applicableProducts: [],
  createdAt: new Date().toISOString(),
}

describe('promotions helpers', () => {
  it('getPromotionStatus returns active', () => {
    const s = getPromotionStatus(basePromotion)
    expect(s).toBe('active')
  })

  it('getPromotionStatus returns scheduled and expired and inactive', () => {
    const scheduled = { ...basePromotion, startDate: new Date(Date.now() + 7*24*60*60*1000).toISOString() }
    expect(getPromotionStatus(scheduled)).toBe('scheduled')
    const expired = { ...basePromotion, endDate: new Date(Date.now() - 24*60*60*1000).toISOString() }
    expect(getPromotionStatus(expired)).toBe('expired')
    const inactive = { ...basePromotion, isActive: false }
    expect(getPromotionStatus(inactive)).toBe('inactive')
  })

  it('paginate slices correctly', () => {
    const arr = Array.from({ length: 50 }, (_, i) => i)
    const p1 = paginate(arr, 1, 10)
    const p3 = paginate(arr, 3, 10)
    expect(p1.length).toBe(10)
    expect(p1[0]).toBe(0)
    expect(p3[0]).toBe(20)
  })

  it('sortPromotions sorts by discount', () => {
    const promos = [
      { ...basePromotion, id: 'a', discountValue: 5 },
      { ...basePromotion, id: 'b', discountValue: 15 },
      { ...basePromotion, id: 'c', discountValue: 10 },
    ]
    const asc = sortPromotions(promos, 'discount', 'asc')
    const desc = sortPromotions(promos, 'discount', 'desc')
    expect(asc.map(p=>p.id)).toEqual(['a','c','b'])
    expect(desc.map(p=>p.id)).toEqual(['b','c','a'])
  })

  it('impactLevel categorizes percentage and fixed amount', () => {
    const pPctLow = { ...basePromotion, discountValue: 5 }
    const pPctMed = { ...basePromotion, discountValue: 15 }
    const pPctHigh = { ...basePromotion, discountValue: 35 }
    expect(impactLevel(pPctLow)).toBe('bajo')
    expect(impactLevel(pPctMed)).toBe('medio')
    expect(impactLevel(pPctHigh)).toBe('alto')
    const pFix = { ...basePromotion, discountType: 'FIXED_AMOUNT' as const, discountValue: 30, minPurchaseAmount: 100 }
    expect(impactLevel(pFix)).toBe('alto')
  })
})