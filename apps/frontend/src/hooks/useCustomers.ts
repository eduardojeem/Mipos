import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Customer } from '@/types'

const normalizeCustomersArray = (r: any): Customer[] => Array.isArray(r?.data?.data)
  ? r.data.data
  : (Array.isArray(r?.data?.customers)
      ? r.data.customers
      : (Array.isArray(r?.data)
          ? r.data
          : []))

export function useCustomers() {
  return useQuery<Customer[], any>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers', { timeout: 10000 })
      return normalizeCustomersArray(res)
    },
    staleTime: 5 * 60_000, // 5 minutos
    gcTime: 10 * 60_000,
  })
}