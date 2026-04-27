import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import * as supabaseServer from '@/lib/supabase/server'
import * as subscriptionLib from '@/app/api/subscription/_lib'

vi.mock('@/app/api/_utils/auth')
vi.mock('@/lib/supabase/server')
vi.mock('@/app/api/subscription/_lib')

type TableResponses = Record<string, any>

function makeAdminClient(responses: TableResponses) {
  const build = (table: string) => {
    const state: any = { table, selectArgs: null }

    const api: any = {
      select: (...args: any[]) => {
        state.selectArgs = args
        return api
      },
      eq: () => api,
      gte: () => api,
      order: () => api,
      limit: () => api,
      single: async () => responses[table]?.single ?? { data: null, error: null },
      maybeSingle: async () => responses[table]?.maybeSingle ?? { data: null, error: null },
      then: (resolve: any, reject: any) => {
        const r = responses[table]?.then
        return Promise.resolve(r ?? { data: [], error: null, count: responses[table]?.count ?? null })
          .then(resolve, reject)
      },
    }
    return api
  }

  return { from: (table: string) => build(table) }
}

describe('Superadmin org operational health API', () => {
  let request: NextRequest

  beforeEach(() => {
    vi.clearAllMocks()
    request = { url: 'http://localhost:3000/api/superadmin/organizations/org-1/operational-health?windowDays=30', method: 'GET' } as any
  })

  it('returns indicators with sources', async () => {
    vi.mocked(assertSuperAdmin).mockResolvedValue({ ok: true } as any)
    vi.mocked(subscriptionLib.getSubscriptionSnapshot).mockResolvedValue({
      plan: { limits: { maxUsers: 3, maxProducts: 50, maxLocations: 1, maxTransactionsPerMonth: 100 } },
      subscriptionStatus: 'active',
      currentPeriodEnd: '2026-05-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    } as any)
    vi.mocked(subscriptionLib.getUsageSnapshot).mockResolvedValue({ users: 2, products: 10, locations: 1, transactions: 12 } as any)

    vi.mocked(supabaseServer.createAdminClient).mockResolvedValue(
      makeAdminClient({
        organizations: {
          single: { data: { id: 'org-1', created_at: '2026-01-01T00:00:00.000Z', subscription_status: 'ACTIVE', subscription_plan: 'FREE' }, error: null },
        },
        saas_subscriptions: {
          maybeSingle: { data: { status: 'active', cancel_at_period_end: false, current_period_end: '2026-05-01T00:00:00.000Z' }, error: null },
        },
        sales: {
          maybeSingle: { data: { created_at: '2026-04-25T12:00:00.000Z' }, error: null },
        },
        audit_logs: {
          maybeSingle: { data: { created_at: '2026-04-24T12:00:00.000Z' }, error: null },
          then: { data: [], error: null, count: 5 },
          count: 5,
        },
        cash_sessions: {
          then: { data: [], error: null },
        },
      }) as any
    )

    const response = await GET(request, { params: Promise.resolve({ id: 'org-1' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data.indicators)).toBe(true)
    expect(json.data.indicators[0]).toHaveProperty('source.tableOrView')
  })
})

