/**
 * Property-based tests for validator utilities
 * Tests universal properties that should hold across all inputs
 * 
 * **Feature: home-refactor**
 */

import fc from 'fast-check';
import {
  validateNumber,
  validateArray,
  validateImageUrl,
} from '../validators';

describe('validators - property-based tests', () => {
  describe('validateNumber', () => {
    /**
     * **Feature: home-refactor, Property 9: Number validation handles invalid inputs**
     * **Validates: Requirements 11.2**
     * 
     * Property: For any input value and fallback, validateNumber should always
     * return a valid, finite number (never NaN or Infinity)
     */
    it('should always return a valid finite number', () => {
      fc.assert(
        fc.property(
          fc.anything(), // Any possible input
          fc.integer(), // Any fallback value
          (input, fallback) => {
            const result = validateNumber(input, fallback);
            
            // Result must be a number
            expect(typeof result).toBe('number');
            
            // Result must not be NaN
            expect(Number.isNaN(result)).toBe(false);
            
            // Result must be finite
            expect(Number.isFinite(result)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any invalid input (null, undefined, NaN), the result
     * should equal the fallback value
     */
    it('should return fallback for invalid inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity),
            fc.string().filter(s => isNaN(Number(s)))
          ),
          fc.integer(),
          (invalidInput, fallback) => {
            const result = validateNumber(invalidInput, fallback);
            expect(result).toBe(fallback);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid numeric input, the result should equal
     * the numeric value of that input
     */
    it('should return numeric value for valid inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.float({ noNaN: true, noDefaultInfinity: true }),
            fc.double({ noNaN: true, noDefaultInfinity: true })
          ),
          fc.integer(),
          (validInput, fallback) => {
            const result = validateNumber(validInput, fallback);
            expect(result).toBe(Number(validInput));
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateArray', () => {
    /**
     * **Feature: home-refactor, Property 10: Array validation ensures array type**
     * **Validates: Requirements 11.5**
     * 
     * Property: For any input value, validateArray should always return an array
     */
    it('should always return an array', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (input) => {
            const result = validateArray(input);
            
            // Result must be an array
            expect(Array.isArray(result)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any non-array input, the result should be an empty array
     */
    it('should return empty array for non-array inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.object()
          ),
          (nonArrayInput) => {
            const result = validateArray(nonArrayInput);
            expect(result).toEqual([]);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any array input, the result should equal the input
     * (identity property for valid inputs)
     */
    it('should return the same array for array inputs', () => {
      fc.assert(
        fc.property(
          fc.array(fc.anything()),
          (arrayInput) => {
            const result = validateArray(arrayInput);
            expect(result).toEqual(arrayInput);
            expect(result).toBe(arrayInput); // Same reference
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateImageUrl', () => {
    /**
     * **Feature: home-refactor, Property 11: Image URL validation provides fallbacks**
     * **Validates: Requirements 11.4**
     * 
     * Property: For any input value and fallback, validateImageUrl should always
     * return a non-empty string
     */
    it('should always return a non-empty string', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          fc.string().filter(s => s.trim().length > 0),
          (input, fallback) => {
            const result = validateImageUrl(input, fallback);
            
            // Result must be a string
            expect(typeof result).toBe('string');
            
            // Result must not be empty
            expect(result.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any invalid input (null, undefined, empty, invalid format),
     * the result should equal the fallback
     */
    it('should return fallback for invalid inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.constant('   '),
            fc.string().filter(s => {
              const trimmed = s.trim();
              return trimmed.length > 0 && !trimmed.startsWith('http') && !trimmed.startsWith('/');
            })
          ),
          fc.string().filter(s => s.trim().length > 0),
          (invalidInput, fallback) => {
            const result = validateImageUrl(invalidInput, fallback);
            expect(result).toBe(fallback);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid URL (http/https or relative path), the result
     * should equal the trimmed input
     */
    it('should return trimmed URL for valid inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.webUrl(),
            fc.string().map(s => `/images/${s}.jpg`)
          ),
          fc.string(),
          (validUrl, fallback) => {
            const result = validateImageUrl(validUrl, fallback);
            expect(result).toBe(validUrl.trim());
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
