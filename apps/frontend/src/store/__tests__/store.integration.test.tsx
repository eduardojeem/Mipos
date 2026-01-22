import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React, { useEffect } from 'react'
import { useStore } from '../index'

function PromotionsList() {
  const items = useStore(s => s.items)
  const fetchPromotions = useStore(s => s.fetchPromotions)
  useEffect(() => { void fetchPromotions() }, [fetchPromotions])
  return (
    <ul>
      {items.map(p => (<li key={p.id}>{p.name}</li>))}
    </ul>
  )
}

describe('Store integration with component', () => {
  it('renders promotions fetched via store', async () => {
    vi.mock('@/lib/api', () => ({
      default: { get: async () => ({ data: [{ id: 'p1', name: 'Promo X', discountType: 'PERCENTAGE', discountValue: 10, startDate: '2025-01-01', endDate: '2025-12-31', isActive: true }] }) }
    }))
    render(<PromotionsList />)
    await waitFor(() => {
      expect(screen.getByText('Promo X')).toBeTruthy()
    })
  })
})