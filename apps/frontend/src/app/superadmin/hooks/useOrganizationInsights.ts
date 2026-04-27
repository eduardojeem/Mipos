import { useQuery } from '@tanstack/react-query'

export type HealthStatus = 'ok' | 'warn' | 'critical' | 'na'

export type OrgSummary = {
  organizationId: string
  name: string
  slug: string
  createdAt: string
  subscription: {
    planId: string
    planName: string
    planSlug: string
    status: string
    billingCycle: 'monthly' | 'yearly'
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  }
}

export type OperationalHealth = {
  organizationId: string
  updatedAt: string
  indicators: Array<{
    key: string
    label: string
    status: HealthStatus
    valueText: string
    source: {
      tableOrView: string
      filters: string[]
      calculation: string
    }
  }>
}

export type CurrentUsage = {
  organizationId: string
  plan: {
    slug: string
    name: string
    billingCycle: 'monthly' | 'yearly'
  }
  period: {
    start: string
    end: string
  }
  metrics: Array<{
    key: string
    label: string
    used: number
    limit: number
    unit: 'count' | 'mb'
    source: {
      tableOrView: string
      filters: string[]
      aggregation: string
    }
  }>
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || `Error HTTP ${res.status}`)
  }
  return res.json()
}

export function useOrganizationInsights(organizationId: string) {
  const summary = useQuery({
    queryKey: ['superadmin', 'org', organizationId, 'summary'],
    queryFn: async () => {
      const json = await fetchJson<{ success: true; data: OrgSummary }>(
        `/api/superadmin/organizations/${organizationId}/summary`
      )
      return json.data
    },
    enabled: Boolean(organizationId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const operationalHealth = useQuery({
    queryKey: ['superadmin', 'org', organizationId, 'operational-health'],
    queryFn: async () => {
      const json = await fetchJson<{ success: true; data: OperationalHealth }>(
        `/api/superadmin/organizations/${organizationId}/operational-health?windowDays=30`
      )
      return json.data
    },
    enabled: Boolean(organizationId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const currentUsage = useQuery({
    queryKey: ['superadmin', 'org', organizationId, 'current-usage'],
    queryFn: async () => {
      const json = await fetchJson<{ success: true; data: CurrentUsage }>(
        `/api/superadmin/organizations/${organizationId}/current-usage`
      )
      return json.data
    },
    enabled: Boolean(organizationId),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    summary,
    operationalHealth,
    currentUsage,
  }
}

