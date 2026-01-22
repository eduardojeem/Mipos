import { describe, it, expect } from 'vitest';
import { calculateMovementSummary, MOVEMENT_TYPES } from '../../utils/movementCalculations';
import type { CashMovement } from '../../../../../../types/cash';

describe('Movement Calculations', () => {
  it('calculates summary with correct balance behavior', () => {
    const movements: CashMovement[] = [
      { id: '1', sessionId: 's1', type: MOVEMENT_TYPES.IN, amount: 100, createdAt: new Date().toISOString() },
      { id: '2', sessionId: 's1', type: MOVEMENT_TYPES.OUT, amount: 50, createdAt: new Date().toISOString() },
      { id: '3', sessionId: 's1', type: MOVEMENT_TYPES.SALE, amount: 200, createdAt: new Date().toISOString() },
      { id: '4', sessionId: 's1', type: MOVEMENT_TYPES.RETURN, amount: 30, createdAt: new Date().toISOString() },
      { id: '5', sessionId: 's1', type: MOVEMENT_TYPES.ADJUSTMENT, amount: -10, createdAt: new Date().toISOString() },
    ];

    const summary = calculateMovementSummary(movements);
    expect(summary.in).toBe(100);
    expect(summary.out).toBe(50);
    expect(summary.sale).toBe(200);
    expect(summary.return).toBe(30);
    expect(summary.adjustment).toBe(-10);
    expect(summary.balance).toBe(100 - 50 + 200 - 30 - 10);
  });
});
