export type PromotionLike = {
  id?: string
  name: string
  description?: string | null
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  startDate: string
  endDate: string
  isActive: boolean
  minPurchaseAmount?: number
}

export function getPromotionStatus(promotion: PromotionLike): 'inactive'|'scheduled'|'expired'|'active' {
  const now = new Date()
  const s = new Date(promotion.startDate)
  const e = new Date(promotion.endDate)
  if (!promotion.isActive) return 'inactive'
  if (now < s) return 'scheduled'
  if (now > e) return 'expired'
  return 'active'
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const curPage = Math.min(totalPages, Math.max(1, page))
  const start = (curPage - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function sortPromotions(items: PromotionLike[], sortBy: 'name'|'status'|'discount'|'start'|'end', sortOrder: 'asc'|'desc'): PromotionLike[] {
  const toVal = (p: PromotionLike) => {
    if (sortBy === 'name') return String(p.name || '').toLowerCase()
    if (sortBy === 'status') return getPromotionStatus(p)
    if (sortBy === 'discount') return Number(p.discountValue || 0)
    if (sortBy === 'start') return new Date(p.startDate).getTime()
    return new Date(p.endDate).getTime()
  }
  return [...items].sort((a, b) => {
    const av: any = toVal(a)
    const bv: any = toVal(b)
    if (av < bv) return sortOrder === 'asc' ? -1 : 1
    if (av > bv) return sortOrder === 'asc' ? 1 : -1
    return 0
  })
}

export function impactLevel(promotion: PromotionLike): 'alto'|'medio'|'bajo' {
  if (promotion.discountType === 'PERCENTAGE') {
    const v = Number(promotion.discountValue || 0)
    if (v >= 30) return 'alto'
    if (v >= 15) return 'medio'
    return 'bajo'
  }
  const base = Number(promotion.minPurchaseAmount || 0)
  const val = Number(promotion.discountValue || 0)
  if (base > 0) {
    const pct = (val / base) * 100
    if (pct >= 30) return 'alto'
    if (pct >= 15) return 'medio'
    return 'bajo'
  }
  if (val >= 50) return 'alto'
  if (val >= 20) return 'medio'
  return 'bajo'
}