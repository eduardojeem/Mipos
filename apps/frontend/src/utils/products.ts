import type { Product } from '@/types'
import type { ProductCategory as Category } from '@/types/product'

export function normalizeProduct(raw: any): Product {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    sku: String(raw.sku ?? raw.code ?? ''),
    description: raw.description ?? '',
    sale_price: Number(raw.sale_price ?? raw.price ?? 0),
    offer_price: raw.offer_price != null ? Number(raw.offer_price) : undefined,
    cost_price: Number(raw.cost_price ?? raw.costPrice ?? 0),
    stock_quantity: Number(raw.stock_quantity ?? raw.stock ?? 0),
    min_stock: Number(raw.min_stock ?? raw.minStock ?? 0),
    category_id: String(raw.category_id ?? raw.categoryId ?? ''),
    category: raw.category ? { id: String(raw.category.id), name: String(raw.category.name ?? '') } : undefined,
    image_url: raw.image_url ?? raw.image,
    is_active: raw.is_active ?? raw.isActive ?? true,
    created_at: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updated_at: raw.updated_at ?? raw.updatedAt ?? new Date().toISOString(),
  } as Product
}

export function calculateDashboardStats(products: Product[]) {
  const totalProducts = products.length
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock && p.stock_quantity > 0).length
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0).length
  const totalValue = products.reduce((sum, p) => sum + (p.sale_price * p.stock_quantity), 0)
  const recentlyAdded = products.filter(p => {
    const d = new Date(p.created_at)
    const diffDays = (Date.now() - d.getTime()) / 86400000
    return diffDays <= 7
  }).length
  const topCategory = (() => {
    const counts: Record<string, number> = {}
    products.forEach(p => {
      const c = p.category?.name || p.category_id || 'N/A'
      counts[c] = (counts[c] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  })()
  return { totalProducts, lowStockProducts, outOfStockProducts, totalValue, recentlyAdded, topCategory }
}

export function calculateInventoryTotals(products: Product[]) {
  const safeNum = (n: any) => {
    const v = Number(n)
    return Number.isFinite(v) && v > 0 ? v : 0
  }
  const unitEffectivePrice = (p: Product & { offer_price?: number }) => {
    const offer = safeNum((p as any).offer_price)
    const base = safeNum(p.sale_price)
    return offer > 0 ? offer : base
  }
  const unitNetPrice = (p: Product & { offer_price?: number }) => {
    const effective = unitEffectivePrice(p)
    const rate = safeNum(p.iva_rate ?? (p as any).tax_rate)
    if (p.iva_included && rate > 0) {
      return effective / (1 + rate)
    }
    return effective
  }
  let totalValue = 0
  let totalValueNet = 0
  let totalCost = 0
  for (const p of products) {
    const qty = safeNum(p.stock_quantity)
    totalValue += unitEffectivePrice(p) * qty
    totalValueNet += unitNetPrice(p) * qty
    totalCost += safeNum(p.cost_price) * qty
  }
  const profitPotential = totalValueNet - totalCost
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
  return {
    totalValue: round2(totalValue),
    totalValueNet: round2(totalValueNet),
    totalCost: round2(totalCost),
    profitPotential: round2(profitPotential),
  }
}

export function computeInventoryBreakdown(products: Product[], categories: Category[]) {
  const totalProducts = products.length
  const outOfStockProducts = products.filter(p => Number(p.stock_quantity) === 0).length
  const lowStockProducts = products.filter(p => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= Number(p.min_stock)).length
  const healthyStockProducts = products.filter(p => Number(p.stock_quantity) > Number(p.min_stock)).length

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const recentlyAdded = products.filter(p => new Date(String(p.created_at)) > monthAgo).length

  const averagePrice = totalProducts > 0 ? products.reduce((sum, p) => sum + Number(p.sale_price || 0), 0) / totalProducts : 0
  const stockHealth = totalProducts > 0 ? (healthyStockProducts / totalProducts) * 100 : 0
  const monthlyGrowth = totalProducts > 0 ? (recentlyAdded / totalProducts) * 100 : 0

  // Use effective unit price for value per category (offer if present)
  const effectiveUnit = (p: any) => {
    const offer = Number(p?.offer_price || 0)
    const base = Number(p?.sale_price || 0)
    return offer > 0 ? offer : base
  }

  const categoryDistribution = categories.map((category) => {
    const categoryProducts = products.filter(p => String(p.category_id || '') === String(category.id))
    const count = categoryProducts.length
    const value = categoryProducts.reduce((sum, p) => sum + effectiveUnit(p) * Number(p.stock_quantity || 0), 0)
    const percentage = totalProducts > 0 ? (count / totalProducts) * 100 : 0
    return { name: String(category.name || ''), count, percentage, value }
  }).sort((a, b) => b.value - a.value)

  const topCategory = categoryDistribution[0]?.name || 'Sin categoría'

  return {
    totalProducts,
    outOfStockProducts,
    lowStockProducts,
    healthyStockProducts,
    recentlyAdded,
    averagePrice,
    stockHealth,
    monthlyGrowth,
    categoryDistribution,
    topCategory,
  }
}

export function exportCsv(data: Product[], fields: string[]): string {
  const headers = fields.map(f => f)
  const rows = data.map(product => {
    return fields.map(field => {
      switch (field) {
        case 'category':
          return product.category?.name || 'Sin categoría'
        case 'createdAt':
        case 'updatedAt':
          return field === 'createdAt'
            ? new Date(String(product.created_at)).toLocaleDateString('es-ES')
            : new Date(String(product.updated_at)).toLocaleDateString('es-ES')
        case 'price':
          return String(product.sale_price ?? 0)
        case 'costPrice':
          return String(product.cost_price ?? 0)
        default:
          return String((product as any)[field] ?? '')
      }
    })
  })
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  return csv
}
