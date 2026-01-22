import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Sale } from '@/types'

export interface SalesFilters {
  page: number
  limit: number
  customerId?: string
  paymentMethod?: string
  status?: string
  saleType?: string
  dateFrom?: string
  dateTo?: string
  amountRange?: string // e.g. "0-100", "500+"
}

export interface SalesQueryResult {
  sales: Sale[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

const mapAmountRange = (range?: string): { min: number | null; max: number | null } => {
  if (!range) return { min: null, max: null }
  const plusMatch = range.match(/^(\d+)\+$/)
  if (plusMatch) return { min: Number(plusMatch[1]), max: null }
  const rangeMatch = range.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) }
  const singleMatch = range.match(/^(\d+)$/)
  if (singleMatch) return { min: Number(singleMatch[1]), max: null }
  return { min: null, max: null }
}

const normalizeSalesArray = (r: any): Sale[] => Array.isArray(r?.data?.data)
  ? r.data.data
  : (Array.isArray(r?.data?.sales)
      ? r.data.sales
      : (Array.isArray(r?.data)
          ? r.data
          : []))

const normalizePagination = (r: any, fallback: { page: number; limit: number }): { page: number; limit: number; total: number; pages: number } => {
  const sales = normalizeSalesArray(r)
  const server = r?.data?.pagination
  if (server && typeof server.total === 'number') {
    return server
  }
  const total = sales.length
  const pages = total ? Math.ceil(total / fallback.limit) : 0
  return { page: fallback.page, limit: fallback.limit, total, pages }
}

export function useSalesData(filters: SalesFilters) {
  const { page, limit, customerId, paymentMethod, status, saleType, dateFrom, dateTo, amountRange } = filters
  const { min, max } = mapAmountRange(amountRange)

  return useQuery<SalesQueryResult, any>({
    queryKey: ['sales', { page, limit, customerId, paymentMethod, status, saleType, dateFrom, dateTo, min, max }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (customerId) params.set('customer_id', customerId)
      if (paymentMethod) params.set('payment_method', String(paymentMethod).toUpperCase())
      if (status) params.set('status', String(status).toUpperCase())
      if (saleType) params.set('sale_type', String(saleType).toUpperCase())
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (min !== null) params.set('min_amount', String(min))
      if (max !== null) params.set('max_amount', String(max))

      const res = await api.get(`/sales?${params.toString()}`, { timeout: 10000 })
      const sales = normalizeSalesArray(res)
      const pagination = normalizePagination(res, { page, limit })
      return { sales, pagination }
    },
    placeholderData: (prev) => prev as SalesQueryResult,
    staleTime: 60_000, // 1 minuto para ventas
    gcTime: 5 * 60_000,
  })
}