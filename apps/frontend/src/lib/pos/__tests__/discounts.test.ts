import { composeDiscounts } from '../../pos/discounts';

describe('composeDiscounts', () => {
  test('aplica porcentaje sobre subtotal', () => {
    const total = composeDiscounts(1000, [{ type: 'PERCENTAGE', value: 10 } as any]);
    expect(Math.round(total)).toBe(100);
  });

  test('aplica monto fijo limitado por subtotal', () => {
    const total = composeDiscounts(1000, [{ type: 'FIXED_AMOUNT', value: 1500 } as any]);
    expect(Math.round(total)).toBe(1000);
  });

  test('aplica secuencialmente porcentaje luego monto', () => {
    const total = composeDiscounts(1000, [
      { type: 'PERCENTAGE', value: 10 } as any, // 100
      { type: 'FIXED_AMOUNT', value: 100 } as any // sobre 900
    ]);
    expect(Math.round(total)).toBe(200);
  });

  test('aplica múltiples porcentajes decrecientes', () => {
    const total = composeDiscounts(1000, [
      { type: 'PERCENTAGE', value: 10 } as any, // 100
      { type: 'PERCENTAGE', value: 10 } as any // 90
    ]);
    expect(Math.round(total)).toBe(190);
  });
});