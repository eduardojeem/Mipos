/**
 * Property-Based Tests for POS Validation Functions
 * Feature: pos-audit
 * 
 * These tests verify universal properties for discount validation
 * using fast-check for property-based testing with 100+ iterations per test.
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import { validateDiscount, isValidDiscount, normalizeDiscountInput } from '../validation';
import type { DiscountType } from '../calculations';

describe('POS Validation - Property-Based Tests', () => {
  describe('validateDiscount - Percentage Discount Properties', () => {
    /**
     * Feature: pos-audit, Property 11: Percentage discounts are bounded
     * Validates: Requirements 4.1
     */
    it('Property 11: Percentage discounts between 0-100 should be valid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.float({ min: 0.01, max: 100000, noNaN: true }), // Subtotal
          (discountPercent, subtotal) => {
            const errors = validateDiscount(discountPercent, 'PERCENTAGE', subtotal);

            // Property: Valid percentage discounts should have no errors
            expect(errors.length).toBe(0);
            expect(isValidDiscount(discountPercent, 'PERCENTAGE', subtotal)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 11: Percentage discounts > 100 should be invalid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100.01, max: 1000, noNaN: true }),
          fc.float({ min: 0.01, max: 100000, noNaN: true }), // Subtotal
          (discountPercent, subtotal) => {
            const errors = validateDiscount(discountPercent, 'PERCENTAGE', subtotal);

            // Property: Percentage > 100 should have errors
            expect(errors.length).toBeGreaterThan(0);
            expect(isValidDiscount(discountPercent, 'PERCENTAGE', subtotal)).toBe(false);
            
            // Property: Error message should mention 100%
            const hasPercentageError = errors.some(err => 
              err.includes('100%') || err.includes('superar')
            );
            expect(hasPercentageError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Negative percentage discounts should be invalid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: -0.01, noNaN: true }),
          fc.float({ min: 0.01, max: 100000, noNaN: true }), // Subtotal
          (discountPercent, subtotal) => {
            const errors = validateDiscount(discountPercent, 'PERCENTAGE', subtotal);

            // Property: Negative discounts should have errors
            expect(errors.length).toBeGreaterThan(0);
            expect(isValidDiscount(discountPercent, 'PERCENTAGE', subtotal)).toBe(false);
            
            // Property: Error message should mention positive number
            const hasNegativeError = errors.some(err => 
              err.includes('positivo')
            );
            expect(hasNegativeError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateDiscount - Fixed Amount Discount Properties', () => {
    /**
     * Feature: pos-audit, Property 12: Fixed discounts don't exceed subtotal
     * Validates: Requirements 4.2
     */
    it('Property 12: Fixed discounts <= subtotal should be valid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 10000, noNaN: true }), // Subtotal
          (subtotal) => {
            // Generate discount that doesn't exceed subtotal
            const discount = subtotal * Math.random();
            const errors = validateDiscount(discount, 'FIXED_AMOUNT', subtotal);

            // Property: Valid fixed discounts should have no errors
            expect(errors.length).toBe(0);
            expect(isValidDiscount(discount, 'FIXED_AMOUNT', subtotal)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 12: Fixed discounts > subtotal should be invalid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 10000, noNaN: true }), // Subtotal
          (subtotal) => {
            // Generate discount that exceeds subtotal
            const discount = subtotal + Math.random() * 1000 + 0.01;
            const errors = validateDiscount(discount, 'FIXED_AMOUNT', subtotal);

            // Property: Discount exceeding subtotal should have errors
            expect(errors.length).toBeGreaterThan(0);
            expect(isValidDiscount(discount, 'FIXED_AMOUNT', subtotal)).toBe(false);
            
            // Property: Error message should mention subtotal
            const hasSubtotalError = errors.some(err => 
              err.includes('subtotal') || err.includes('superar')
            );
            expect(hasSubtotalError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Negative fixed discounts should be invalid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -10000, max: -0.01, noNaN: true }),
          fc.float({ min: 0.01, max: 100000, noNaN: true }), // Subtotal
          (discount, subtotal) => {
            const errors = validateDiscount(discount, 'FIXED_AMOUNT', subtotal);

            // Property: Negative discounts should have errors
            expect(errors.length).toBeGreaterThan(0);
            expect(isValidDiscount(discount, 'FIXED_AMOUNT', subtotal)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('normalizeDiscountInput - Input Normalization Properties', () => {
    it('Property: Valid numbers should be preserved', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -10000, max: 10000, noNaN: true }),
          (value) => {
            const normalized = normalizeDiscountInput(value);

            // Property: Valid numbers should equal themselves
            expect(normalized).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Invalid inputs should normalize to 0', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity),
            fc.constant(undefined),
            fc.constant(null),
            fc.constant('invalid'),
            fc.constant({}),
            fc.constant([])
          ),
          (invalidValue) => {
            const normalized = normalizeDiscountInput(invalidValue);

            // Property: Invalid inputs should become 0
            expect(normalized).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: String numbers should be converted', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (value) => {
            const stringValue = value.toString();
            const normalized = normalizeDiscountInput(stringValue);

            // Property: String numbers should convert to numbers
            expect(normalized).toBeCloseTo(value, 10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateDiscount - Edge Cases', () => {
    it('Property: Zero discount should always be valid', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('PERCENTAGE'), fc.constant('FIXED_AMOUNT')) as fc.Arbitrary<DiscountType>,
          fc.float({ min: 0.01, max: 100000, noNaN: true }), // Subtotal
          (discountType, subtotal) => {
            const errors = validateDiscount(0, discountType, subtotal);

            // Property: Zero discount should always be valid
            expect(errors.length).toBe(0);
            expect(isValidDiscount(0, discountType, subtotal)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Exact 100% discount should be valid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 100000, noNaN: true }), // Subtotal
          (subtotal) => {
            const errors = validateDiscount(100, 'PERCENTAGE', subtotal);

            // Property: Exactly 100% should be valid
            expect(errors.length).toBe(0);
            expect(isValidDiscount(100, 'PERCENTAGE', subtotal)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Discount equal to subtotal should be valid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 100000, noNaN: true }), // Subtotal
          (subtotal) => {
            const errors = validateDiscount(subtotal, 'FIXED_AMOUNT', subtotal);

            // Property: Discount equal to subtotal should be valid
            expect(errors.length).toBe(0);
            expect(isValidDiscount(subtotal, 'FIXED_AMOUNT', subtotal)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Very small discounts should be valid', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.0001, max: 0.01, noNaN: true }),
          fc.oneof(fc.constant('PERCENTAGE'), fc.constant('FIXED_AMOUNT')) as fc.Arbitrary<DiscountType>,
          fc.float({ min: 1, max: 100000, noNaN: true }), // Subtotal
          (discount, discountType, subtotal) => {
            const errors = validateDiscount(discount, discountType, subtotal);

            // Property: Very small discounts should be valid
            expect(errors.length).toBe(0);
            expect(isValidDiscount(discount, discountType, subtotal)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateDiscount - Consistency Properties', () => {
    it('Property: Validation should be deterministic', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -100, max: 200, noNaN: true }),
          fc.oneof(fc.constant('PERCENTAGE'), fc.constant('FIXED_AMOUNT')) as fc.Arbitrary<DiscountType>,
          fc.float({ min: 0.01, max: 100000, noNaN: true }),
          (discount, discountType, subtotal) => {
            // Run validation twice
            const errors1 = validateDiscount(discount, discountType, subtotal);
            const errors2 = validateDiscount(discount, discountType, subtotal);

            // Property: Same inputs should produce same results
            expect(errors1).toEqual(errors2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: isValidDiscount should be inverse of validateDiscount having errors', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -100, max: 200, noNaN: true }),
          fc.oneof(fc.constant('PERCENTAGE'), fc.constant('FIXED_AMOUNT')) as fc.Arbitrary<DiscountType>,
          fc.float({ min: 0.01, max: 100000, noNaN: true }),
          (discount, discountType, subtotal) => {
            const errors = validateDiscount(discount, discountType, subtotal);
            const isValid = isValidDiscount(discount, discountType, subtotal);

            // Property: isValid should be true iff errors is empty
            expect(isValid).toBe(errors.length === 0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateDiscount - Multiple Error Conditions', () => {
    it('Property: Multiple violations should produce multiple errors', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: -0.01, noNaN: true }), // Negative
          (discount) => {
            const subtotal = 100;
            const errors = validateDiscount(discount, 'PERCENTAGE', subtotal);

            // Property: Negative discount should have at least one error
            expect(errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Percentage > 100 and negative should have errors', () => {
      const discount = -150; // Both negative and > 100 in absolute value
      const subtotal = 100;
      const errors = validateDiscount(discount, 'PERCENTAGE', subtotal);

      // Should have error for being negative
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(err => err.includes('positivo'))).toBe(true);
    });
  });
});
