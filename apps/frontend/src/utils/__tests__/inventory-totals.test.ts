import { describe, it, expect } from 'vitest'
import type { Product } from '@/types'
import { calculateInventoryTotals } from '@/utils/products'

const makeProduct = (overrides: Partial<Product & { offer_price?: number }> = {}): Product & { offer_price?: number } => ({
  id: 'p1',
  name: 'Test',
  sku: 'SKU-1',
  description: undefined,
  category_id: 'c1',
  supplier_id: undefined,
  cost_price: 50,
  sale_price: 100,
  wholesale_price: undefined,
  stock_quantity: 10,
  min_stock: 1,
  max_stock: undefined,
  barcode: undefined,
  image_url: undefined,
  images: [],
  is_active: true,
  iva_rate: 0.1,
  iva_included: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  offer_price: undefined,
  ...overrides,
})

describe('calculateInventoryTotals', () => {
  it('calcula total por producto', () => {
    const p = makeProduct({ sale_price: 120, stock_quantity: 3 })
    const res = calculateInventoryTotals([p])
    expect(res.totalValue).toBe(360)
    expect(res.totalCost).toBe(150)
  })

  it('suma acumulativa del total general', () => {
    const a = makeProduct({ id: 'a', sale_price: 100, stock_quantity: 2 })
    const b = makeProduct({ id: 'b', sale_price: 200, stock_quantity: 1 })
    const res = calculateInventoryTotals([a, b])
    expect(res.totalValue).toBe(400)
    expect(res.totalCost).toBe(150) // (50*2) + (50*1)
  })

  it('usa oferta cuando offer_price', () => {
    const p = makeProduct({ sale_price: 100, offer_price: 80, stock_quantity: 5 })
    const res = calculateInventoryTotals([p])
    expect(res.totalValue).toBe(400)
  })

  it('excluye IVA cuando iva_included', () => {
    const p = makeProduct({ sale_price: 110, stock_quantity: 1, iva_included: true, iva_rate: 0.1 })
    const res = calculateInventoryTotals([p])
    expect(Number(res.totalValueNet.toFixed(2))).toBe(100)
  })

  it('maneja cantidad cero', () => {
    const p = makeProduct({ sale_price: 100, stock_quantity: 0 })
    const res = calculateInventoryTotals([p])
    expect(res.totalValue).toBe(0)
    expect(res.totalCost).toBe(0)
  })

  it('redondea a 2 decimales', () => {
    const p = makeProduct({ sale_price: 33.335, cost_price: 12.499, stock_quantity: 3 })
    const res = calculateInventoryTotals([p])
    expect(res.totalValue).toBe(100.01) // 33.335*3 = 100.005 -> 100.01
    expect(res.totalCost).toBe(37.5)    // 12.499*3 = 37.497 -> 37.5
  })

  it('valida entradas negativas o no numéricas', () => {
    const p = makeProduct({ sale_price: -100 as any, cost_price: NaN as any, stock_quantity: -5 as any })
    const res = calculateInventoryTotals([p])
    expect(res.totalValue).toBe(0)
    expect(res.totalCost).toBe(0)
  })

  it('actualiza al cambiar precios unitarios', () => {
    const p = makeProduct({ sale_price: 100, stock_quantity: 1 })
    let res = calculateInventoryTotals([p])
    expect(res.totalValue).toBe(100)
    const p2 = { ...p, offer_price: 70 }
    res = calculateInventoryTotals([p2])
    expect(res.totalValue).toBe(70)
  })
})
