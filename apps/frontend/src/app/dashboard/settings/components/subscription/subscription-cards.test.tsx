import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillingHistoryCard } from './BillingHistoryCard'
import { PaymentMethodCard } from './PaymentMethodCard'
import { DangerZoneCard } from './DangerZoneCard'

describe('BillingHistoryCard', () => {
  it('renders empty state', () => {
    render(
      <BillingHistoryCard invoices={[]} isLoading={false} onRetry={() => undefined} />
    )

    expect(screen.getByText('Sin facturas aún')).toBeTruthy()
  })

  it('renders invoices and download link', () => {
    render(
      <BillingHistoryCard
        isLoading={false}
        onRetry={() => undefined}
        invoices={[
          {
            id: 'inv-1',
            invoice_number: 'INV-0002',
            amount: 25000,
            currency: 'PYG',
            status: 'paid',
            due_date: '2026-01-10T00:00:00Z',
            paid_at: '2026-01-09T00:00:00Z',
            pdf_url: 'https://example.com/invoice.pdf',
          },
        ]}
      />
    )

    expect(screen.getAllByText('INV-0002').length).toBeGreaterThan(0)
    const link = screen.getAllByRole('link')[0]
    expect(link.getAttribute('href')).toBe('https://example.com/invoice.pdf')
  })
})

describe('PaymentMethodCard', () => {
  it('disables edit button when cannot manage', () => {
    render(
      <PaymentMethodCard
        canManage={false}
        paymentMethod={null}
        isLoading={false}
        isSaving={false}
        onSave={async () => undefined}
        onRefresh={() => undefined}
      />
    )

    expect(screen.getByRole('button', { name: /editar/i }).getAttribute('disabled')).not.toBeNull()
    expect(screen.getByText(/solo owner o super_admin/i)).toBeTruthy()
  })
})

describe('DangerZoneCard', () => {
  it('requires CANCELAR confirmation before enabling confirm', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn(async () => undefined)

    render(
      <DangerZoneCard
        canManage={true}
        cancelAtPeriodEnd={false}
        currentPeriodEnd={new Date().toISOString()}
        isCanceling={false}
        onCancel={onCancel}
        onScrollToPlans={() => undefined}
        onRefresh={() => undefined}
      />
    )

    await user.click(screen.getByRole('button', { name: /cancelar plan/i }))
    const confirm = screen.getByRole('button', { name: /confirmar cancelación/i })
    expect(confirm.getAttribute('disabled')).not.toBeNull()

    await user.type(screen.getByLabelText(/confirmación/i), 'CANCELAR')
    expect(screen.getByRole('button', { name: /confirmar cancelación/i }).getAttribute('disabled')).toBeNull()
  })
})
