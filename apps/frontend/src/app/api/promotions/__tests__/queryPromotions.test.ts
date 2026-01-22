import { describe, it, expect, beforeEach } from 'vitest'
import { createPromotion, queryPromotions, __clearPromotionsForTests, togglePromotionStatus } from '../data'

describe('queryPromotions', () => {
  beforeEach(() => {
    __clearPromotionsForTests()
    // Seed promotions
    createPromotion({
      name: 'Promo Activa Verano',
      description: 'Descuento en categoría Bebidas',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      startDate: new Date('2025-06-01').toISOString(),
      endDate: new Date('2025-08-31').toISOString(),
      applicableProductIds: ['p1'],
      usageLimit: 0,
    })
    const winter = createPromotion({
      name: 'Promo Inactiva Invierno',
      description: 'Fijo en categoría Comidas',
      discountType: 'FIXED_AMOUNT',
      discountValue: 50,
      startDate: new Date('2025-12-01').toISOString(),
      endDate: new Date('2026-02-28').toISOString(),
      applicableProductIds: ['p2'],
      usageLimit: 0,
    })
    togglePromotionStatus(winter.id, false)
    // Toggle second to inactive by updating internal store directly via query filter later
    // Note: createPromotion sets isActive true. We'll emulate an inactive by filtering status after manual change.
    // Since no direct API here, a third promotion will be used as inactive simulation by date range.
    createPromotion({
      name: 'Promo Pasada Primavera',
      description: 'Antigua en categoría Bebidas',
      discountType: 'PERCENTAGE',
      discountValue: 5,
      startDate: new Date('2024-03-01').toISOString(),
      endDate: new Date('2024-04-30').toISOString(),
      applicableProductIds: ['p3'],
      usageLimit: 0,
    })
  })

  it('should paginate results', () => {
    const { items, total, pages } = queryPromotions({ page: 1, limit: 2 })
    expect(total).toBe(3)
    expect(items.length).toBe(2)
    expect(pages).toBe(2)
  })

  it('should filter by search term (name)', () => {
    const { items } = queryPromotions({ search: 'Verano' })
    expect(items.every(i => i.name.includes('Verano'))).toBe(true)
  })

  it('should filter by date range intersection', () => {
    const { items } = queryPromotions({ dateFrom: '2025-06-15', dateTo: '2025-06-20' })
    // Only Verano should match
    expect(items.length).toBe(1)
    expect(items[0].name).toMatch(/Verano/)
  })

  it('should filter by status inactive', () => {
    const { items } = queryPromotions({ status: 'inactive' })
    expect(items.length).toBe(1)
    expect(items[0].name).toMatch(/Invierno/)
  })
})