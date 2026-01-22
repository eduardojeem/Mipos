import { describe, it, expect, beforeEach } from 'vitest'
import { __clearPromotionsForTests, createPromotion, getCarouselIds, setCarousel, getCarouselPromotions } from '../data'

describe('Promotions carousel', () => {
  beforeEach(() => {
    __clearPromotionsForTests()
  })

  it('persists and normalizes carousel ids', () => {
    const a = createPromotion({ name: 'Promo A', description: 'desc A', discountType: 'PERCENTAGE', discountValue: 10, startDate: new Date().toISOString(), endDate: new Date(Date.now()+86400000).toISOString(), applicableProductIds: [] })
    const b = createPromotion({ name: 'Promo B', description: 'desc B', discountType: 'FIXED_AMOUNT', discountValue: 500, startDate: new Date().toISOString(), endDate: new Date(Date.now()+86400000).toISOString(), applicableProductIds: [] })
    const c = createPromotion({ name: 'Promo C', description: 'desc C', discountType: 'PERCENTAGE', discountValue: 5, startDate: new Date().toISOString(), endDate: new Date(Date.now()+86400000).toISOString(), applicableProductIds: [] })

    const res = setCarousel([a.id, b.id, b.id, c.id, 'non-existent'])
    expect(res.ids).toEqual([a.id, b.id, c.id])
    expect(getCarouselIds()).toEqual([a.id, b.id, c.id])

    const items = getCarouselPromotions()
    expect(items.map(i => i.id)).toEqual([a.id, b.id, c.id])
  })
})