import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCheckout } from '@/hooks/useCheckout'
import type { CartItem } from '@/hooks/useCart'
import type { Product, Customer } from '@/types'

vi.mock('@/lib/api', () => {
  return {
    default: {
      post: vi.fn().mockResolvedValue({ data: { id: 'sale-1' } }),
    },
  }
})

vi.mock('@/lib/toast', () => {
  return {
    toast: {
      show: vi.fn(),
    },
  }
})

// Utilizamos una configuración simple: un producto sin IVA incluido al 10%
const products: Product[] = [
  {
    id: 'p1',
    name: 'Prod 1',
    sku: 'SKU-1',
    cost_price: 80,
    sale_price: 100,
    iva_rate: 10,
    iva_included: false,
    category_id: 'cat1',
    supplier_id: undefined,
    stock_quantity: 0,
    min_stock: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
]

const customer: Customer = {
  id: 'c1',
  name: 'Juan Perez',
  email: 'juan@example.com',
  phone: undefined,
  address: undefined,
  customer_type: 'RETAIL',
  status: 'ACTIVE',
  is_active: true,
  created_at: '',
  updated_at: '',
}

beforeEach(async () => {
  const api = await import('@/lib/api')
  const { toast } = await import('@/lib/toast')
  ;(api.default.post as any).mockClear()
  ;(toast.show as any).mockClear()
})

describe('useCheckout', () => {
  it('envía payload correcto a /sales y retorna totales esperados', async () => {
    const cart: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Prod 1',
        price: 100,
        quantity: 2,
        discount: 0,
        total: 200,
      },
    ]

    const { result } = renderHook(() =>
      useCheckout({
        products,
        discount: 0,
        discountType: 'FIXED_AMOUNT',
        paymentMethod: 'CASH',
        notes: 'venta test',
        selectedCustomer: customer,
      })
    )

    const api = await import('@/lib/api')

    let response = null as any
    await act(async () => {
      response = await result.current.processSale(cart)
    })

    expect(api.default.post).toHaveBeenCalledTimes(1)
    const [url, payload] = (api.default.post as any).mock.calls[0]
    expect(url).toBe('/sales')

    expect(payload.customer_id).toBe('c1')
    expect(payload.payment_method).toBe('CASH')
    expect(payload.notes).toBe('venta test')

    expect(payload.items).toEqual([
      {
        product_id: 'p1',
        quantity: 2,
        unit_price: 100,
        discount_amount: 0,
      },
    ])

    expect(payload.tax_amount).toBeCloseTo(20, 5)
    expect(payload.discount_amount).toBeCloseTo(0, 5)

    expect(response).toEqual({
      subtotalWithoutIva: 200,
      totalIva: 20,
      subtotalWithIva: 220,
      discountAmount: 0,
      finalTotal: 220,
    })
  })

  it('aplica descuento porcentual sobre subtotal con IVA y refleja en payload/respuesta', async () => {
    const cart: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Prod 1',
        price: 100,
        quantity: 2,
        discount: 0,
        total: 200,
      },
    ]

    const { result } = renderHook(() =>
      useCheckout({
        products,
        discount: 10,
        discountType: 'PERCENTAGE',
        paymentMethod: 'CARD',
        notes: 'venta desc %',
        selectedCustomer: customer,
      })
    )

    const api = await import('@/lib/api')

    let response = null as any
    await act(async () => {
      response = await result.current.processSale(cart)
    })

    expect(api.default.post).toHaveBeenCalledTimes(1)
    const [url, payload] = (api.default.post as any).mock.calls[0]
    expect(url).toBe('/sales')

    // Base: subtotal=200, IVA=20, subtotalWithIva=220
    // Descuento 10% sobre 220 => 22; total=198
    expect(payload.discount_amount).toBeCloseTo(22, 5)
    expect(payload.tax_amount).toBeCloseTo(20, 5)

    expect(response).toEqual({
      subtotalWithoutIva: 200,
      totalIva: 20,
      subtotalWithIva: 220,
      discountAmount: 22,
      finalTotal: 198,
    })
  })

  it('aplica descuento fijo y respeta no-negatividad del total', async () => {
    const cart: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Prod 1',
        price: 100,
        quantity: 2,
        discount: 0,
        total: 200,
      },
    ]

    const { result } = renderHook(() =>
      useCheckout({
        products,
        discount: 50,
        discountType: 'FIXED_AMOUNT',
        paymentMethod: 'TRANSFER',
        notes: 'venta desc fijo',
        selectedCustomer: customer,
      })
    )

    const api = await import('@/lib/api')

    let response = null as any
    await act(async () => {
      response = await result.current.processSale(cart)
    })

    expect(api.default.post).toHaveBeenCalledTimes(1)
    const [, payload] = (api.default.post as any).mock.calls[0]

    // Base: subtotalWithIva=220; descuento fijo: 50 => total=170
    expect(payload.discount_amount).toBeCloseTo(50, 5)
    expect(response).toEqual({
      subtotalWithoutIva: 200,
      totalIva: 20,
      subtotalWithIva: 220,
      discountAmount: 50,
      finalTotal: 170,
    })
  })

  it('procesa múltiples productos con IVAs mixtos e IVA incluido/no incluido', async () => {
    const productsMixed: Product[] = [
      {
        id: 'p1',
        name: 'Prod 1 NI 10%',
        sku: 'SKU-1',
        cost_price: 80,
        sale_price: 100,
        iva_rate: 10,
        iva_included: false,
        category_id: 'cat1',
        supplier_id: undefined,
        stock_quantity: 0,
        min_stock: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'p2',
        name: 'Prod 2 I 5%',
        sku: 'SKU-2',
        cost_price: 90,
        sale_price: 105,
        iva_rate: 5,
        iva_included: true,
        category_id: 'cat2',
        supplier_id: undefined,
        stock_quantity: 0,
        min_stock: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    ]

    const cart: CartItem[] = [
      {
        product_id: 'p1',
        product_name: 'Prod 1 NI 10%',
        price: 100,
        quantity: 1,
        discount: 0,
        total: 100,
      },
      {
        product_id: 'p2',
        product_name: 'Prod 2 I 5%',
        price: 105, // incluye IVA 5%
        quantity: 1,
        discount: 0,
        total: 105,
      },
    ]

    const { result } = renderHook(() =>
      useCheckout({
        products: productsMixed,
        discount: 0,
        discountType: 'FIXED_AMOUNT',
        paymentMethod: 'OTHER',
        notes: 'venta mixta',
        selectedCustomer: customer,
      })
    )

    const api = await import('@/lib/api')

    let response = null as any
    await act(async () => {
      response = await result.current.processSale(cart)
    })

    expect(api.default.post).toHaveBeenCalledTimes(1)
    const [, payload] = (api.default.post as any).mock.calls[0]

    // Esperados:
    // p1 (NI 10%): base 100, IVA 10, total 110
    // p2 (I 5%): base 100, IVA 5, total 105
    // Totales: base 200, IVA 15, withIva 215, total 215
    expect(payload.tax_amount).toBeCloseTo(15, 5)
    expect(payload.discount_amount).toBeCloseTo(0, 5)

    expect(response).toEqual({
      subtotalWithoutIva: 200,
      totalIva: 15,
      subtotalWithIva: 215,
      discountAmount: 0,
      finalTotal: 215,
    })
  })

  it('calcula totales con 3 productos mixtos y descuento porcentual', async () => {
    const products3: Product[] = [
      {
        id: 'p1',
        name: 'Prod 1 NI 10%',
        sku: 'SKU-1',
        cost_price: 80,
        sale_price: 100,
        iva_rate: 10,
        iva_included: false,
        category_id: 'cat1',
        supplier_id: undefined,
        stock_quantity: 0,
        min_stock: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'p2',
        name: 'Prod 2 I 5%',
        sku: 'SKU-2',
        cost_price: 90,
        sale_price: 105,
        iva_rate: 5,
        iva_included: true,
        category_id: 'cat2',
        supplier_id: undefined,
        stock_quantity: 0,
        min_stock: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'p3',
        name: 'Prod 3 I 10%',
        sku: 'SKU-3',
        cost_price: 100,
        sale_price: 110,
        iva_rate: 10,
        iva_included: true,
        category_id: 'cat3',
        supplier_id: undefined,
        stock_quantity: 0,
        min_stock: 0,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    ]

    const cart: CartItem[] = [
      { product_id: 'p1', product_name: 'Prod 1 NI 10%', price: 100, quantity: 1, discount: 0, total: 100 },
      { product_id: 'p2', product_name: 'Prod 2 I 5%', price: 105, quantity: 2, discount: 0, total: 210 },
      { product_id: 'p3', product_name: 'Prod 3 I 10%', price: 110, quantity: 3, discount: 0, total: 330 },
    ]

    const { result } = renderHook(() =>
      useCheckout({
        products: products3,
        discount: 10,
        discountType: 'PERCENTAGE',
        paymentMethod: 'CARD',
        notes: 'venta 3 mix %',
        selectedCustomer: customer,
      })
    )

    const api = await import('@/lib/api')

    let response = null as any
    await act(async () => {
      response = await result.current.processSale(cart)
    })

    expect(api.default.post).toHaveBeenCalledTimes(1)
    const [, payload] = (api.default.post as any).mock.calls[0]

    // Totales esperados:
    // p1 (NI 10%) qty 1: base 100, IVA 10
    // p2 (I 5%) qty 2: base 200, IVA 10
    // p3 (I 10%) qty 3: base 300, IVA 30
    // Base 600, IVA 50, withIva 650, descuento 10% => 65, total 585
    expect(payload.tax_amount).toBeCloseTo(50, 5)
    expect(payload.discount_amount).toBeCloseTo(65, 5)

    expect(response).toEqual({
      subtotalWithoutIva: 600,
      totalIva: 50,
      subtotalWithIva: 650,
      discountAmount: 65,
      finalTotal: 585,
    })
  })

  // Nuevo: IVA mixto con descuento fijo
  it('procesa tres productos con IVA mixto y descuento fijo, valida totales y config de reintentos', async () => {
    const productsFixed: Product[] = [
      {
        id: 'p1', name: 'Prod 1 NI 10%', sku: 'SKU-1', cost_price: 80, sale_price: 100, iva_rate: 10, iva_included: false,
        category_id: 'cat1', supplier_id: undefined, stock_quantity: 0, min_stock: 0, is_active: true, created_at: '', updated_at: ''
      },
      {
        id: 'p2', name: 'Prod 2 I 5%', sku: 'SKU-2', cost_price: 90, sale_price: 100, iva_rate: 5, iva_included: true,
        category_id: 'cat2', supplier_id: undefined, stock_quantity: 0, min_stock: 0, is_active: true, created_at: '', updated_at: ''
      },
      {
        id: 'p3', name: 'Prod 3 I 10%', sku: 'SKU-3', cost_price: 95, sale_price: 110, iva_rate: 10, iva_included: true,
        category_id: 'cat3', supplier_id: undefined, stock_quantity: 0, min_stock: 0, is_active: true, created_at: '', updated_at: ''
      },
    ]

    const cart: CartItem[] = [
      { product_id: 'p1', product_name: 'Prod 1 NI 10%', price: 100, quantity: 1, discount: 0, total: 100 },
      { product_id: 'p2', product_name: 'Prod 2 I 5%', price: 100, quantity: 2, discount: 0, total: 200 },
      { product_id: 'p3', product_name: 'Prod 3 I 10%', price: 110, quantity: 3, discount: 0, total: 330 },
    ]

    const { result } = renderHook(() =>
      useCheckout({
        products: productsFixed,
        discount: 120,
        discountType: 'FIXED_AMOUNT',
        paymentMethod: 'CARD',
        notes: 'venta 3 mix fijo',
        selectedCustomer: customer,
      })
    )

    const api = await import('@/lib/api')

    let response: any = null
    await act(async () => {
      response = await result.current.processSale(cart)
    })

    expect(api.default.post).toHaveBeenCalledTimes(1)
    const [, payload, config] = (api.default.post as any).mock.calls[0]

    // Totales esperados:
    // Base ~590.48, IVA ~49.52, con IVA 640, descuento fijo 120 => total 520
    expect(payload.tax_amount).toBeCloseTo(49.52, 2)
    expect(payload.discount_amount).toBeCloseTo(120, 2)

    expect(response).toEqual({
      subtotalWithoutIva: 590.48,
      totalIva: 49.52,
      subtotalWithIva: 640,
      discountAmount: 120,
      finalTotal: 520,
    })

    // Verificar que la operación fija límites de reintentos
    expect(config?._maxRetries).toBe(2)
    expect(config?.headers?.['X-Request-Name']).toBe('create-sale')
  })

  // Nuevo: Integración de flujo de venta completa (cliente, notas, método, IVA mixto)
  it('flujo completo de venta: construye payload, respeta reintentos y devuelve totales', async () => {
    const productsInt: Product[] = [
      { id: 'a1', name: 'Ni 12%', sku: 'A-1', cost_price: 70, sale_price: 100, iva_rate: 12, iva_included: false,
        category_id: 'cA', supplier_id: undefined, stock_quantity: 0, min_stock: 0, is_active: true, created_at: '', updated_at: '' },
      { id: 'a2', name: 'Inc 8%', sku: 'A-2', cost_price: 85, sale_price: 110, iva_rate: 8, iva_included: true,
        category_id: 'cB', supplier_id: undefined, stock_quantity: 0, min_stock: 0, is_active: true, created_at: '', updated_at: '' },
    ]

    const cart: CartItem[] = [
      { product_id: 'a1', product_name: 'Ni 12%', price: 100, quantity: 2, discount: 0, total: 200 },
      { product_id: 'a2', product_name: 'Inc 8%', price: 110, quantity: 1, discount: 0, total: 110 },
    ]

    const { result } = renderHook(() =>
      useCheckout({
        products: productsInt,
        discount: 0,
        discountType: 'FIXED_AMOUNT',
        paymentMethod: 'TRANSFER',
        notes: 'flujo completo',
        selectedCustomer: customer,
      })
    )

    const api = await import('@/lib/api')
    const { toast } = await import('@/lib/toast')

    let response: any = null
    await act(async () => {
      response = await result.current.processSale(cart)
    })

    expect(api.default.post).toHaveBeenCalledTimes(1)
    const [url, payload, config] = (api.default.post as any).mock.calls[0]
    expect(url).toBe('/sales')

    // Subtotales:
    // a1 (NI 12%) qty 2: base 200, IVA 24
    // a2 (I 8%) qty 1: base ~101.85, IVA ~8.15
    // Base ~301.85, IVA ~32.15, withIva 334, sin descuento => total 334
    expect(payload.items).toEqual([
      { product_id: 'a1', quantity: 2, unit_price: 100, discount_amount: 0 },
      { product_id: 'a2', quantity: 1, unit_price: 110, discount_amount: 0 },
    ])
    expect(payload.customer_id).toBe('c1')
    expect(payload.payment_method).toBe('TRANSFER')
    expect(payload.notes).toBe('flujo completo')

    expect(payload.tax_amount).toBeCloseTo(32.15, 2)
    expect(payload.discount_amount).toBeCloseTo(0, 2)

    expect(response).toEqual({
      subtotalWithoutIva: 301.85,
      totalIva: 32.15,
      subtotalWithIva: 334,
      discountAmount: 0,
      finalTotal: 334,
    })

    // No debe mostrarse toast de error
    expect(toast.show).not.toHaveBeenCalled()

    // Reintentos configurados correctamente
    expect(config?._maxRetries).toBe(2)
    expect(config?.headers?.['X-Request-Name']).toBe('create-sale')
  })

  it('retorna null y muestra toast cuando el carrito está vacío', async () => {
    const { result } = renderHook(() =>
      useCheckout({
        products,
        discount: 0,
        discountType: 'FIXED_AMOUNT',
        paymentMethod: 'CASH',
        notes: 'venta test',
        selectedCustomer: customer,
      })
    )

    const { toast } = await import('@/lib/toast')

    let response: any = 'not-null'
    await act(async () => {
      response = await result.current.processSale([])
    })

    expect(response).toBeNull()
    expect(toast.show).toHaveBeenCalled()
  })
})