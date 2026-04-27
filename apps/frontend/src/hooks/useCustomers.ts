import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import type { Customer } from '@/types'
import { useCurrentOrganizationId } from '@/hooks/use-current-organization'

export function useCustomers() {
  const supabase = createClient()
  const orgId = useCurrentOrganizationId()

  return useQuery<Customer[], any>({
    queryKey: ['customers', orgId],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('id, name, email, phone')
        .order('name')
      if (orgId) query = query.eq('organization_id', orgId)

      const { data, error } = await query
      if (!error && Array.isArray(data)) return data as Customer[]

      // Fallback mínimo: devolver lista vacía si falla
      return []
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false
  })
}
