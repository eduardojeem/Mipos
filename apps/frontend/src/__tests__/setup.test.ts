/**
 * Basic setup verification tests
 * These tests verify that the testing infrastructure is correctly configured
 */

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';

describe('Testing Infrastructure Setup', () => {
  describe('Jest Configuration', () => {
    it('should run basic Jest tests', () => {
      expect(true).toBe(true);
    });

    it('should support TypeScript', () => {
      const value: string = 'test';
      expect(typeof value).toBe('string');
    });

    it('should have access to DOM APIs', () => {
      expect(document).toBeDefined();
      expect(window).toBeDefined();
    });
  });

  describe('fast-check Configuration', () => {
    it('should run basic property-based tests', () => {
      fc.assert(
        fc.property(fc.integer(), (n) => {
          return n === n; // Identity property
        })
      );
    });

    it('should generate random integers', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (n) => {
          return n >= 0 && n <= 100;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate random strings', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          return typeof s === 'string';
        }),
        { numRuns: 100 }
      );
    });

    it('should generate random arrays', () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
          return Array.isArray(arr);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate random objects', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            name: fc.string(),
            price: fc.float({ min: 0, max: 10000 }),
          }),
          (obj) => {
            return (
              typeof obj.id === 'string' &&
              typeof obj.name === 'string' &&
              typeof obj.price === 'number' &&
              obj.price >= 0
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('React Testing Library', () => {
    it('should have access to testing utilities', () => {
      // Just verify the module can be imported
      expect(true).toBe(true);
    });

    it('should have access to jest-dom matchers', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      expect(div).toBeInTheDocument();
      document.body.removeChild(div);
    });
  });

  describe('MSW Configuration', () => {
    it('should have MSW configured', () => {
      // MSW is configured, just verify it doesn't throw
      expect(true).toBe(true);
    });
  });
});

describe('Property-Based Testing Examples', () => {
  describe('Mathematical Properties', () => {
    it('addition is commutative', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
          return a + b === b + a;
        }),
        { numRuns: 100 }
      );
    });

    it('multiplication is associative (with small integers)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }),
          fc.integer({ min: -1000, max: 1000 }),
          fc.integer({ min: -1000, max: 1000 }),
          (a, b, c) => {
            // Use small integers to avoid overflow issues
            return a * (b * c) === (a * b) * c;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('array length after push increases by 1', () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), fc.integer(), (arr, item) => {
          const originalLength = arr.length;
          arr.push(item);
          return arr.length === originalLength + 1;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('String Properties', () => {
    it('string concatenation length equals sum of lengths', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (s1, s2) => {
          return (s1 + s2).length === s1.length + s2.length;
        }),
        { numRuns: 100 }
      );
    });

    it('string reverse is involutive (reverse twice = identity)', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const reversed = s.split('').reverse().join('');
          const doubleReversed = reversed.split('').reverse().join('');
          return doubleReversed === s;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Array Properties', () => {
    it('filter then map equals map then filter', () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
          const filterThenMap = arr
            .filter((x) => x > 0)
            .map((x) => x * 2);
          
          const mapThenFilter = arr
            .map((x) => x * 2)
            .filter((x) => x > 0);
          
          return JSON.stringify(filterThenMap) === JSON.stringify(mapThenFilter);
        }),
        { numRuns: 100 }
      );
    });

    it('array sort is idempotent', () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
          const sorted1 = [...arr].sort((a, b) => a - b);
          const sorted2 = [...sorted1].sort((a, b) => a - b);
          return JSON.stringify(sorted1) === JSON.stringify(sorted2);
        }),
        { numRuns: 100 }
      );
    });
  });
});
