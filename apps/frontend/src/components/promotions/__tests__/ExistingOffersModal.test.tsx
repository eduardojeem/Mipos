import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExistingOffersModal from '../ExistingOffersModal'

vi.mock('@/lib/api', () => {
  const get = vi.fn(async (url: string, options?: any) => {
    const search = options?.params?.search || ''
    const page = options?.params?.page || 1
    const limit = options?.params?.limit || 10
    const base = [
      { id: 'p1', name: 'Promo Uno', description: 'Desc A', discountType: 'PERCENTAGE', discountValue: 10, startDate: new Date('2025-01-01').toISOString(), endDate: new Date('2025-12-31').toISOString(), isActive: true, applicableProducts: [{ id: 'x', category: 'Bebidas' }] },
      { id: 'p2', name: 'Winter Deal', description: 'Desc B', discountType: 'FIXED_AMOUNT', discountValue: 50, startDate: new Date('2025-11-01').toISOString(), endDate: new Date('2026-02-28').toISOString(), isActive: false, applicableProducts: [{ id: 'y', category: 'Comidas' }] },
      { id: 'p3', name: 'Promo Tres', description: 'Desc C', discountType: 'PERCENTAGE', discountValue: 5, startDate: new Date('2024-03-01').toISOString(), endDate: new Date('2024-04-30').toISOString(), isActive: true, applicableProducts: [{ id: 'z', category: 'Bebidas' }] },
    ]
    const filtered = base.filter(p => p.name.toLowerCase().includes(String(search).toLowerCase()))
    const start = (page - 1) * limit
    const data = filtered.slice(start, start + limit)
    return { data: { success: true, data, count: filtered.length } }
  })
  return { default: { get } }
})

describe('ExistingOffersModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads and displays promotions when opened', async () => {
    render(<ExistingOffersModal open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Ofertas existentes')).toBeInTheDocument()
    })

    // Should render item names
    await waitFor(() => {
      expect(screen.getByText(/Promo Uno/)).toBeInTheDocument()
    })
  })

  it('applies search filter and updates list', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ExistingOffersModal open={true} onOpenChange={() => {}} />)

    const input = await screen.findByPlaceholderText(/Buscar por nombre o código/i)
    await user.clear(input)
    await user.type(input, 'Winter')
    vi.advanceTimersByTime(350)

    await waitFor(() => {
      expect(screen.getByText(/Winter Deal/)).toBeInTheDocument()
    })
  })
})