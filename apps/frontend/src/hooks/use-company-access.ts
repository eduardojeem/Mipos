'use client'

import { useQuery } from '@tanstack/react-query'

interface CompanyAccessContext {
  userId: string
  email: string | null
  companyId: string | null
  plan: string
  role: string
  isOwner: boolean
  isSuperAdmin: boolean
  permissions: string[]
  features: string[]
}

interface UseCompanyAccessOptions {
  permission?: string
  feature?: string
  companyId?: string
  enabled?: boolean
}

export function useCompanyAccess(options: UseCompanyAccessOptions = {}) {
  const { permission, feature, companyId, enabled = true } = options

  return useQuery({
    queryKey: ['company-access', permission || null, feature || null, companyId || null],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (permission) params.set('permission', permission)
      if (feature) params.set('feature', feature)
      if (companyId) params.set('companyId', companyId)

      const response = await fetch(`/api/auth/access?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        return {
          allowed: false,
          context: null,
          error: payload?.error || 'Acceso denegado',
        }
      }

      return {
        allowed: Boolean(payload?.allowed),
        context: (payload?.context || null) as CompanyAccessContext | null,
        error: null,
      }
    },
  })
}
