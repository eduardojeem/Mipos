/**
 * Tests for property-based testing configuration
 */

import fc from 'fast-check';
import {
  arbitraries,
  DEFAULT_PROPERTY_TEST_CONFIG,
  runPropertyTest,
} from '../property-test-config';

describe('Property Test Configuration', () => {
  describe('arbitraries', () => {
    it('should generate valid promotion IDs', () => {
      fc.assert(
        fc.property(arbitraries.promotionId(), (id) => {
          // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return typeof id === 'string' && uuidRegex.test(id);
        }),
        { numRuns: 10 } // Reduced for faster test
      );
    });

    it('should generate arrays of promotion IDs', () => {
      fc.assert(
        fc.property(arbitraries.promotionIds(), (ids) => {
          return Array.isArray(ids) && ids.every((id) => typeof id === 'string');
        }),
        { numRuns: 10 }
      );
    });

    it('should generate carousel-sized arrays (0-10 items)', () => {
      fc.assert(
        fc.property(arbitraries.carouselIds(), (ids) => {
          return Array.isArray(ids) && ids.length >= 0 && ids.length <= 10;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate oversized carousel arrays (11+ items)', () => {
      fc.assert(
        fc.property(arbitraries.oversizedCarouselIds(), (ids) => {
          return Array.isArray(ids) && ids.length >= 11;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid promotion objects', () => {
      fc.assert(
        fc.property(arbitraries.promotion(), (promo) => {
          return (
            typeof promo.id === 'string' &&
            typeof promo.name === 'string' &&
            typeof promo.description === 'string' &&
            ['PERCENTAGE', 'FIXED_AMOUNT'].includes(promo.discountType) &&
            typeof promo.discountValue === 'number' &&
            typeof promo.startDate === 'string' &&
            typeof promo.endDate === 'string' &&
            typeof promo.isActive === 'boolean'
          );
        }),
        { numRuns: 10 }
      );
    });
  });

  describe('runPropertyTest', () => {
    it('should run property test with default config', () => {
      expect(() => {
        runPropertyTest(
          fc.integer(),
          (n) => typeof n === 'number',
          { numRuns: 10 }
        );
      }).not.toThrow();
    });

    it('should fail when property does not hold', () => {
      expect(() => {
        runPropertyTest(
          fc.integer(),
          (n) => n > 1000000, // This will fail for most integers
          { numRuns: 10 }
        );
      }).toThrow();
    });
  });

  describe('DEFAULT_PROPERTY_TEST_CONFIG', () => {
    it('should have numRuns set to 100', () => {
      expect(DEFAULT_PROPERTY_TEST_CONFIG.numRuns).toBe(100);
    });

    it('should respect environment variables', () => {
      const originalVerbose = process.env.VERBOSE_TESTS;
      const originalSeed = process.env.TEST_SEED;

      process.env.VERBOSE_TESTS = 'true';
      process.env.TEST_SEED = '12345';

      // Re-import to get updated config
      jest.resetModules();
      const { DEFAULT_PROPERTY_TEST_CONFIG: config } = require('../property-test-config');

      expect(config.verbose).toBe(true);
      expect(config.seed).toBe(12345);

      // Restore
      process.env.VERBOSE_TESTS = originalVerbose;
      process.env.TEST_SEED = originalSeed;
    });
  });
});
