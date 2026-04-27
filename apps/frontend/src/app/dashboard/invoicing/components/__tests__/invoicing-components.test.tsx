import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvoiceStatusBadge } from '../InvoiceStatusBadge';
import { PosInvoicesTable } from '../PosInvoicesTable';

vi.mock('next/link', () => {
  return {
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

describe('InvoiceStatusBadge', () => {
  it('renders spanish labels', () => {
    render(
      <div>
        <InvoiceStatusBadge status="draft" />
        <InvoiceStatusBadge status="issued" />
        <InvoiceStatusBadge status="paid" />
        <InvoiceStatusBadge status="overdue" />
        <InvoiceStatusBadge status="void" />
      </div>
    );

    expect(screen.getByText('Borrador')).toBeTruthy();
    expect(screen.getByText('Emitida')).toBeTruthy();
    expect(screen.getByText('Pagada')).toBeTruthy();
    expect(screen.getByText('Vencida')).toBeTruthy();
    expect(screen.getByText('Anulada')).toBeTruthy();
  });
});

describe('PosInvoicesTable', () => {
  it('renders empty state', () => {
    render(<PosInvoicesTable invoices={[]} isLoading={false} error={null} />);
    expect(screen.getByText('No se encontraron facturas')).toBeTruthy();
  });

  it('renders seed button when handler provided', () => {
    render(
      <PosInvoicesTable
        invoices={[]}
        isLoading={false}
        error={null}
        onSeedExampleData={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: 'Cargar datos de ejemplo' })).toBeTruthy();
  });

  it('renders invoice rows and view action', async () => {
    const onView = vi.fn();
    const user = userEvent.setup();
    render(
      <PosInvoicesTable
        invoices={[
          {
            id: 'inv-1',
            invoiceNumber: 'INV-20260101-1234',
            status: 'draft',
            currency: 'USD',
            issuedDate: '2026-01-01',
            dueDate: '2026-02-01',
            customerName: 'Cliente Demo',
            total: 100,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ]}
        isLoading={false}
        error={null}
        onView={onView}
      />
    );

    expect(screen.getByText('INV-20260101-1234')).toBeTruthy();
    expect(screen.getByText('Cliente Demo')).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Detalles' });
    await user.click(button);
    expect(onView).toHaveBeenCalledWith('inv-1');
  });
});
