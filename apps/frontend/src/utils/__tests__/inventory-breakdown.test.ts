import { describe, it, expect } from 'vitest'
import type { Product } from '@/types'
import type { ProductCategory } from '@/types/product'
import { computeInventoryBreakdown } from '@/utils/products'

const makeProduct = (overrides: Partial<Product & { offer_price?: number }> = {}): Product & { offer_price?: number } => ({
  id: (overrides.id as any) || 'p',
  name: 'X',
  sku: 'S',
  description: undefined,
  category_id: (overrides.category_id as any) || 'c1',
  supplier_id: undefined,
  cost_price: (overrides.cost_price as any) ?? 10,
  sale_price: (overrides.sale_price as any) ?? 20,
  wholesale_price: undefined,
  stock_quantity: (overrides.stock_quantity as any) ?? 5,
  min_stock: (overrides.min_stock as any) ?? 1,
  max_stock: undefined,
  barcode: undefined,
  image_url: undefined,
  images: [],
  is_active: true,
  iva_rate: 0.1,
  iva_included: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  offer_price: overrides.offer_price as any,
})

const makeCategory = (id: string, name: string): ProductCategory => ({ id, name, description: null, parent_id: null, color: null, icon: null, sort_order: null, is_active: true, metadata: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: null, updated_by: null })

describe('computeInventoryBreakdown', () => {
  it('calcula outOfStock, lowStock, healthy', () => {
    const products = [
      makeProduct({ stock_quantity: 0 }),
      makeProduct({ stock_quantity: 1, min_stock: 2 }),
      makeProduct({ stock_quantity: 5, min_stock: 2 }),
    ]
    const cats = [makeCategory('c1', 'A')]
    const r = computeInventoryBreakdown(products, cats)
    expect(r.outOfStockProducts).toBe(1)
    expect(r.lowStockProducts).toBe(1)
    expect(r.healthyStockProducts).toBe(1)
  })

  it('calcula distribución por categoría con valor efectivo', () => {
    const products = [
      makeProduct({ id: 'p1', category_id: 'c1', sale_price: 100, stock_quantity: 2 }),
      makeProduct({ id: 'p2', category_id: 'c2', sale_price: 50, offer_price: 40, stock_quantity: 3 }),
    ]
    const cats = [makeCategory('c1', 'A'), makeCategory('c2', 'B')]
    const r = computeInventoryBreakdown(products, cats)
    const a = r.categoryDistribution.find(x => x.name === 'A')!
    const b = r.categoryDistribution.find(x => x.name === 'B')!
    expect(a.value).toBe(200) // 100*2
    expect(b.value).toBe(120) // 40*3 (oferta)
    expect(r.topCategory).toBe('A')
  })
})
