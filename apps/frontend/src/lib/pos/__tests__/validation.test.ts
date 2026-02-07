import { describe, it, expect } from 'vitest';
import { validateDiscount, isValidDiscount, normalizeDiscountInput } from '../validation';

describe('normalizeDiscountInput', () => {
  it('returns valid numbers as-is', () => {
    expect(normalizeDiscountInput(10)).toBe(10);
    expect(normalizeDiscountInput(0)).toBe(0);
    expect(normalizeDiscountInput(99.99)).toBe(99.99);
  });

  it('converts string numbers to numbers', () => {
    expect(normalizeDiscountInput('10')).toBe(10);
    expect(normalizeDiscountInput('0.5')).toBe(0.5);
  });

  it('returns 0 for invalid inputs', () => {
    expect(normalizeDiscountInput(NaN)).toBe(0);
    expect(normalizeDiscountInput(Infinity)).toBe(0);
    expect(normalizeDiscountInput(-Infinity)).toBe(0);
    expect(normalizeDiscountInput(undefined)).toBe(0);
    expect(normalizeDiscountInput(null)).toBe(0);
    expect(normalizeDiscountInput('invalid')).toBe(0);
  });
});

describe('validateDiscount', () => {
  const subtotal = 1000;

  describe('percentage discounts', () => {
    it('accepts valid percentage discounts', () => {
      const errors = validateDiscount(10, 'PERCENTAGE', subtotal);
      expect(errors).toHaveLength(0);
    });

    it('rejects percentage discounts over 100', () => {
      const errors = validateDiscount(150, 'PERCENTAGE', subtotal);
      expect(errors).toContain('El descuento porcentual no puede superar el 100%.');
    });

    it('accepts 0% discount', () => {
      const errors = validateDiscount(0, 'PERCENTAGE', subtotal);
      expect(errors).toHaveLength(0);
    });

    it('accepts 100% discount', () => {
      const errors = validateDiscount(100, 'PERCENTAGE', subtotal);
      expect(errors).toHaveLength(0);
    });
  });

  describe('fixed amount discounts', () => {
    it('accepts valid fixed amount discounts', () => {
      const errors = validateDiscount(500, 'FIXED_AMOUNT', subtotal);
      expect(errors).toHaveLength(0);
    });

    it('rejects fixed amount discounts exceeding subtotal', () => {
      const errors = validateDiscount(1500, 'FIXED_AMOUNT', subtotal);
      expect(errors).toContain('El descuento fijo no puede superar el subtotal con IVA.');
    });

    it('accepts discount equal to subtotal', () => {
      const errors = validateDiscount(1000, 'FIXED_AMOUNT', subtotal);
      expect(errors).toHaveLength(0);
    });

    it('accepts 0 discount', () => {
      const errors = validateDiscount(0, 'FIXED_AMOUNT', subtotal);
      expect(errors).toHaveLength(0);
    });
  });

  describe('negative discounts', () => {
    it('rejects negative percentage discounts', () => {
      const errors = validateDiscount(-10, 'PERCENTAGE', subtotal);
      expect(errors).toContain('El descuento debe ser un número positivo.');
    });

    it('rejects negative fixed amount discounts', () => {
      const errors = validateDiscount(-50, 'FIXED_AMOUNT', subtotal);
      expect(errors).toContain('El descuento debe ser un número positivo.');
    });
  });

  describe('multiple errors', () => {
    it('returns multiple errors when applicable', () => {
      const errors = validateDiscount(-150, 'PERCENTAGE', subtotal);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('isValidDiscount', () => {
  const subtotal = 1000;

  it('returns true for valid discounts', () => {
    expect(isValidDiscount(10, 'PERCENTAGE', subtotal)).toBe(true);
    expect(isValidDiscount(500, 'FIXED_AMOUNT', subtotal)).toBe(true);
  });

  it('returns false for invalid discounts', () => {
    expect(isValidDiscount(150, 'PERCENTAGE', subtotal)).toBe(false);
    expect(isValidDiscount(1500, 'FIXED_AMOUNT', subtotal)).toBe(false);
    expect(isValidDiscount(-10, 'PERCENTAGE', subtotal)).toBe(false);
  });
});
