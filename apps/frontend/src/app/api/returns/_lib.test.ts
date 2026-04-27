import { describe, expect, it } from 'vitest';
import {
  aggregateReturnItems,
  calculateReturnsStats,
  filterReturnRowsInMemory,
  isMissingRelationError,
  matchesReturnSearchTerm,
  normalizeReturnFilterEndDate,
  normalizeReturnFilterStartDate,
  normalizeRefundMethodToDb,
  normalizeReturnStatusToDb,
  normalizeReturnStatusToUi,
  parseBoundedInteger,
  parseReturnRefundMethod,
} from './_lib';

describe('returns api helpers', () => {
  it('normalizes refund methods and statuses', () => {
    expect(parseReturnRefundMethod('cash')).toBe('CASH');
    expect(parseReturnRefundMethod('other')).toBe('OTHER');
    expect(parseReturnRefundMethod('store_credit')).toBeNull();
    expect(parseReturnRefundMethod(undefined)).toBeNull();

    expect(normalizeRefundMethodToDb('cash')).toBe('CASH');
    expect(normalizeRefundMethodToDb('bank_transfer')).toBe('TRANSFER');
    expect(normalizeRefundMethodToDb('store_credit')).toBe('OTHER');

    expect(normalizeReturnStatusToDb('processed')).toBe('COMPLETED');
    expect(normalizeReturnStatusToDb('approved')).toBe('APPROVED');
    expect(normalizeReturnStatusToUi('COMPLETED')).toBe('processed');
    expect(normalizeReturnStatusToUi('REJECTED')).toBe('rejected');
  });

  it('clamps bounded integers and falls back on invalid pagination params', () => {
    expect(parseBoundedInteger('5', 1, 1, 10)).toBe(5);
    expect(parseBoundedInteger('0', 1, 1, 10)).toBe(1);
    expect(parseBoundedInteger('999', 25, 1, 100)).toBe(100);
    expect(parseBoundedInteger('abc', 25, 1, 100)).toBe(25);
  });

  it('aggregates duplicate return items by original sale item', () => {
    const result = aggregateReturnItems([
      {
        originalSaleItemId: 'sale-item-1',
        productId: 'product-1',
        quantity: 1,
        unitPrice: 25,
        reason: 'Golpeado',
      },
      {
        originalSaleItemId: 'sale-item-1',
        productId: 'product-1',
        quantity: 2,
        unitPrice: 25,
      },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.items).toEqual([
      {
        originalSaleItemId: 'sale-item-1',
        productId: 'product-1',
        quantity: 3,
        unitPrice: 25,
        reason: 'Golpeado',
      },
    ]);
  });

  it('calculates return stats including processing time and return rate', () => {
    const stats = calculateReturnsStats(
      [
        {
          id: 'return-1',
          status: 'COMPLETED',
          total_amount: 120,
          created_at: '2026-04-12T10:00:00.000Z',
          processed_at: '2026-04-12T12:00:00.000Z',
          reason: 'Producto defectuoso',
        },
        {
          id: 'return-2',
          status: 'APPROVED',
          total_amount: 80,
          created_at: '2026-04-12T09:00:00.000Z',
          updated_at: '2026-04-12T09:30:00.000Z',
          reason: 'Cliente no satisfecho',
        },
        {
          id: 'return-3',
          status: 'REJECTED',
          total_amount: 40,
          created_at: '2026-04-11T08:00:00.000Z',
          updated_at: '2026-04-11T09:00:00.000Z',
          reason: 'Fuera de politica',
        },
      ],
      12
    );

    expect(stats).toMatchObject({
      totalReturns: 3,
      totalAmount: 240,
      approvedReturns: 1,
      approvedAmount: 80,
      rejectedReturns: 1,
      rejectedAmount: 40,
      completedReturns: 1,
      completedAmount: 120,
      avgProcessingTime: 2,
      returnRate: 25,
    });
  });

  it('matches return search terms across customer, sale and reason', () => {
    const row = {
      id: 'return-abc-123',
      original_sale_id: 'sale-xyz-987',
      reason: 'Producto defectuoso',
      customer: { name: 'Cliente Uno' },
    };

    expect(matchesReturnSearchTerm(row, 'cliente')).toBe(true);
    expect(matchesReturnSearchTerm(row, 'defectuoso')).toBe(true);
    expect(matchesReturnSearchTerm(row, 'sale-xyz')).toBe(true);
    expect(matchesReturnSearchTerm(row, 'return-abc')).toBe(true);
    expect(matchesReturnSearchTerm(row, 'inexistente')).toBe(false);
  });

  it('normalizes date-only filters to inclusive UTC boundaries', () => {
    expect(normalizeReturnFilterStartDate('2026-04-17')).toBe('2026-04-17T00:00:00.000Z');
    expect(normalizeReturnFilterEndDate('2026-04-17')).toBe('2026-04-17T23:59:59.999Z');
  });

  it('detects missing relation errors from PostgREST compatibility fallbacks', () => {
    expect(
      isMissingRelationError({
        code: 'PGRST200',
        message: 'Could not find a relationship between returns and customers',
      })
    ).toBe(true);

    expect(isMissingRelationError({ message: 'permission denied' })).toBe(false);
  });

  it('filters legacy return rows in memory without losing search or ordering', () => {
    const filtered = filterReturnRowsInMemory(
      [
        {
          id: 'return-older',
          status: 'PENDING',
          refund_method: 'CARD',
          reason: 'Producto defectuoso',
          customer_id: 'customer-1',
          customer: { name: 'Ana' },
          created_at: '2026-04-10T12:00:00.000Z',
        },
        {
          id: 'return-newer',
          status: 'PENDING',
          refund_method: 'CARD',
          reason: 'Producto defectuoso',
          customer_id: 'customer-1',
          customer: { name: 'Ana' },
          created_at: '2026-04-12T08:00:00.000Z',
        },
        {
          id: 'return-other',
          status: 'REJECTED',
          refund_method: 'CASH',
          reason: 'Fuera de politica',
          customer_id: 'customer-2',
          customer: { name: 'Bruno' },
          created_at: '2026-04-11T08:00:00.000Z',
        },
      ],
      {
        search: 'ana',
        status: 'PENDING',
        customerId: 'customer-1',
        startDate: '2026-04-10T00:00:00.000Z',
        endDate: '2026-04-12T23:59:59.999Z',
        refundMethod: 'CARD',
      }
    );

    expect(filtered.map((row) => row.id)).toEqual(['return-newer', 'return-older']);
  });
});
