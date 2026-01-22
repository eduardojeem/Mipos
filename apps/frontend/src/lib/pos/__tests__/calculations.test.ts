import { describe, it, expect } from 'vitest'
import { calculateCartWithIva } from '@/lib/pos/calculations'
import { DEFAULT_IVA_RATE_PARAGUAY } from '@/lib/pos/constants'
import type { Product } from '@/types'
import type { CartItem } from '@/hooks/useCart'

function makeProduct(overrides: Partial<Product> = {}): Product {
  const base: Product = {
    id: overrides.id ?? 'p1',
    name: overrides.name ?? 'Prod',
    sku: overrides.sku ?? 'SKU-1',
    description: overrides.description,
    cost_price: overrides.cost_price ?? 50,
    sale_price: overrides.sale_price ?? 100,
    stock_quantity: overrides.stock_quantity ?? 100,
    min_stock: overrides.min_stock ?? 1,
    max_stock: overrides.max_stock,
    category_id: overrides.category_id ?? 'cat1',
    supplier_id: overrides.supplier_id,
    barcode: overrides.barcode,
    image_url: overrides.image_url,
    is_active: overrides.is_active ?? true,
    regular_price: overrides.regular_price,
    discount_percentage: overrides.discount_percentage,
    rating: overrides.rating,
    images: overrides.images,
    iva_rate: overrides.iva_rate,
    iva_included: overrides.iva_included,
    brand: overrides.brand,
    shade: overrides.shade,
    skin_type: overrides.skin_type,
    ingredients: overrides.ingredients,
    volume: overrides.volume,
    spf: overrides.spf,
    finish: overrides.finish,
    coverage: overrides.coverage,
    waterproof: overrides.waterproof,
    vegan: overrides.vegan,
    cruelty_free: overrides.cruelty_free,
    expiration_date: overrides.expiration_date,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    category: overrides.category,
    supplier: overrides.supplier,
  }
  return base
}

function makeItem({ product_id, price, quantity, product_name = 'Prod' }: { product_id: string; price: number; quantity: number; product_name?: string }): CartItem {
  return {
    product_id,
    product_name,
    price,
    quantity,
    total: price * quantity,
  }
}

describe('calculateCartWithIva', () => {
  it('calcula correctamente un producto sin IVA incluido (10%)', () => {
    const products: Product[] = [
      makeProduct({ id: 'A', iva_rate: 10, iva_included: false, sale_price: 100 })
    ]
    const cart: CartItem[] = [makeItem({ product_id: 'A', price: 100, quantity: 2 })] // total=200 base

    const totals = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT')

    expect(totals.subtotal).toBe(200) // sin IVA
    expect(totals.taxAmount).toBe(20)
    expect(totals.subtotalWithIva).toBe(220)
    expect(totals.discountAmount).toBe(0)
    expect(totals.total).toBe(220)
    expect(totals.itemCount).toBe(2)

    expect(totals.itemsWithIva).toHaveLength(1)
    expect(totals.itemsWithIva[0].subtotal_without_iva).toBe(200)
    expect(totals.itemsWithIva[0].iva_amount).toBe(20)
    expect(totals.itemsWithIva[0].iva_rate).toBe(10)
  })

  it('calcula correctamente un producto con IVA incluido (10%)', () => {
    const products: Product[] = [
      makeProduct({ id: 'B', iva_rate: 10, iva_included: true, sale_price: 110 })
    ]
    const cart: CartItem[] = [makeItem({ product_id: 'B', price: 110, quantity: 1 })] // total=110 con IVA

    const totals = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT')

    // 110 = base * 1.10 -> base = 100, IVA = 10
    expect(totals.subtotal).toBe(100)
    expect(totals.taxAmount).toBe(10)
    expect(totals.subtotalWithIva).toBe(110)
    expect(totals.total).toBe(110)
  })

  it('suma productos mixtos con tasas distintas y modos mixtos', () => {
    const products: Product[] = [
      makeProduct({ id: 'C', iva_rate: 5, iva_included: false, sale_price: 200 }), // base
      makeProduct({ id: 'D', iva_rate: 10, iva_included: true, sale_price: 110 }), // con IVA
    ]
    const cart: CartItem[] = [
      makeItem({ product_id: 'C', price: 200, quantity: 1 }), // base=200, iva=10, conIva=210
      makeItem({ product_id: 'D', price: 110, quantity: 2 }), // cada uno: base=100, iva=10; total base=200, iva=20, conIva=220
    ]

    const totals = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT')

    expect(totals.subtotal).toBe(400) // 200 + 200
    expect(totals.taxAmount).toBe(30)  // 10 + 20
    expect(totals.subtotalWithIva).toBe(430) // 210 + 220
    expect(totals.total).toBe(430)
    expect(totals.itemCount).toBe(3)
  })

  it('aplica descuento porcentual sobre subtotal con IVA', () => {
    const products: Product[] = [
      makeProduct({ id: 'E', iva_rate: 10, iva_included: false, sale_price: 100 }),
    ]
    const cart: CartItem[] = [makeItem({ product_id: 'E', price: 100, quantity: 1 })] // base=100, iva=10, conIva=110

    const totals = calculateCartWithIva(cart, products, 10, 'PERCENTAGE') // 10%

    expect(totals.subtotalWithIva).toBe(110)
    expect(totals.discountAmount).toBe(11) // 10% de 110
    expect(totals.total).toBe(99)
  })

  it('aplica descuento fijo y no permite totales negativos', () => {
    const products: Product[] = [
      makeProduct({ id: 'F', iva_rate: 10, iva_included: false, sale_price: 50 }),
    ]
    const cart: CartItem[] = [makeItem({ product_id: 'F', price: 50, quantity: 1 })] // base=50, iva=5, conIva=55

    const totals = calculateCartWithIva(cart, products, 100, 'FIXED_AMOUNT') // mayor que subtotal con IVA

    expect(totals.subtotalWithIva).toBe(55)
    expect(totals.discountAmount).toBe(100) // se mantiene el monto solicitado
    expect(totals.total).toBe(0) // clamp a 0
  })

  it('usa tasa de IVA por defecto cuando el producto no tiene iva_rate', () => {
    const products: Product[] = [
      // sin iva_rate ni iva_included -> defaults: rate=DEFAULT_IVA_RATE_PARAGUAY, included=false
      makeProduct({ id: 'G' }),
    ]
    const cart: CartItem[] = [makeItem({ product_id: 'G', price: 100, quantity: 1 })]

    const totals = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT')

    expect(totals.subtotal).toBe(100)
    expect(totals.taxAmount).toBe(100 * (DEFAULT_IVA_RATE_PARAGUAY / 100))
    expect(totals.subtotalWithIva).toBe(110)
    expect(totals.total).toBe(110)
    expect(totals.itemsWithIva[0].iva_rate).toBe(DEFAULT_IVA_RATE_PARAGUAY)
  })

  it('redondea correctamente con decimales en precio y cantidad (IVA no incluido)', () => {
    const products: Product[] = [
      makeProduct({ id: 'H', iva_rate: 10, iva_included: false, sale_price: 19.955 }),
    ]
    const cart: CartItem[] = [makeItem({ product_id: 'H', price: 19.955, quantity: 3 })]

    const totals = calculateCartWithIva(cart, products, 0, 'FIXED_AMOUNT')

    // base=19.955*3 = 59.865
    // tax = base * 0.10 = 5.9865
    // subtotalWithIva = 65.8515
    expect(totals.subtotal).toBeCloseTo(59.86, 2)
    expect(totals.taxAmount).toBeCloseTo(5.99, 2)
    expect(totals.subtotalWithIva).toBeCloseTo(65.85, 2)
    expect(totals.total).toBeCloseTo(65.85, 2)
  })
})