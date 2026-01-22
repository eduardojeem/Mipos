import { describe, it, expect } from 'vitest';
import { calculateMovementStats, buildMovementParams, countActiveFilters } from '../../utils/movementHelpers';
import type { CashMovement } from '../../../../../../types/cash';

describe('Movement Helpers', () => {
  it('calculates movement stats correctly', () => {
    const movements: CashMovement[] = [
      { id: '1', sessionId: 's1', type: 'IN', amount: 100, reason: 'Ingreso', createdAt: new Date().toISOString() },
      { id: '2', sessionId: 's1', type: 'OUT', amount: 50, reason: 'Egreso', createdAt: new Date().toISOString() },
      { id: '3', sessionId: 's1', type: 'SALE', amount: 200, reason: 'Venta', referenceType: 'SALE', referenceId: 'sale1', createdAt: new Date().toISOString() },
      { id: '4', sessionId: 's1', type: 'RETURN', amount: -30, reason: 'Devolución', referenceType: 'RETURN', referenceId: 'ret1', createdAt: new Date().toISOString() },
      { id: '5', sessionId: 's1', type: 'ADJUSTMENT', amount: -10, reason: 'Ajuste', createdAt: new Date().toISOString() },
    ];

    const stats = calculateMovementStats(movements);
    expect(stats.total).toBe(5);
    expect(stats.in).toBe(1);
    expect(stats.out).toBe(1);
    expect(stats.sale).toBe(1);
    expect(stats.return).toBe(1);
    expect(stats.adjustment).toBe(1);
    expect(stats.totalAmount).toBe(100 + 50 + 200 - 30 - 10);
    expect(stats.inAmount).toBe(100);
    expect(stats.outAmount).toBe(50);
    expect(stats.saleAmount).toBe(200);
    expect(stats.returnAmount).toBe(-30);
  });

  it('builds movement params excluding defaults', () => {
    const params = buildMovementParams({
      sessionId: 'abc',
      type: 'IN',
      from: '2025-01-01',
      to: '2025-01-31',
      search: 'ajuste',
      amountMin: '10',
      amountMax: '100',
      referenceType: 'SALE',
      userId: 'user-1',
      page: 2,
      limit: 50,
      include: 'user',
      orderBy: 'amount',
      orderDir: 'asc',
    });
    expect(params).toEqual({
      sessionId: 'abc',
      type: 'IN',
      from: '2025-01-01',
      to: '2025-01-31',
      search: 'ajuste',
      amountMin: '10',
      amountMax: '100',
      referenceType: 'SALE',
      userId: 'user-1',
      page: '2',
      limit: '50',
      include: 'user',
      orderBy: 'amount',
      orderDir: 'asc',
    });
  });

  it('counts active filters correctly', () => {
    const count = countActiveFilters({
      type: 'IN',
      from: '2025-01-01',
      to: '2025-01-31',
      search: 'ajuste',
      amountMin: '10',
      amountMax: '100',
      referenceType: 'SALE',
      userId: 'user-1',
    });
    expect(count).toBe(8);
  });
});
