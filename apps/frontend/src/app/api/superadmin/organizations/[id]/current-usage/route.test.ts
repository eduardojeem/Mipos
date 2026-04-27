import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import * as subscriptionLib from '@/app/api/subscription/_lib'

vi.mock('@/app/api/_utils/auth')
vi.mock('@/app/api/subscription/_lib')

describe('Superadmin org current usage API', () => {
  let request: NextRequest

  beforeEach(() => {
    vi.clearAllMocks()
    request = { url: 'http://localhost:3000/api/superadmin/organizations/org-1/current-usage', method: 'GET' } as any
  })

  it('denies when not superadmin', async () => {
    vi.mocked(assertSuperAdmin).mockResolvedValue({ ok: false, status: 403, body: { error: 'forbidden' } } as any)
    const response = await GET(request, { params: Promise.resolve({ id: 'org-1' }) })
    expect(response.status).toBe(403)
  })

  it('returns usage metrics with limits and sources', async () => {
    vi.mocked(assertSuperAdmin).mockResolvedValue({ ok: true } as any)
    vi.mocked(subscriptionLib.getSubscriptionSnapshot).mockResolvedValue({
      plan: {
        slug: 'starter',
        name: 'Starter',
        limits: { maxUsers: 3, maxProducts: 50, maxLocations: 2, maxTransactionsPerMonth: 100 },
      },
      billingCycle: 'monthly',
    } as any)
    vi.mocked(subscriptionLib.getUsageSnapshot).mockResolvedValue({ users: 2, products: 10, locations: 1, transactions: 12 } as any)

    const response = await GET(request, { params: Promise.resolve({ id: 'org-1' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.organizationId).toBe('org-1')
    expect(json.data.plan.slug).toBe('starter')
    expect(json.data.metrics).toHaveLength(4)
    expect(json.data.metrics[0]).toHaveProperty('source.tableOrView')
  })
})

