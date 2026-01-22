/**
 * Configuration for property-based testing with fast-check
 * 
 * This file provides shared configuration and utilities for property-based tests
 * across the application, particularly for the carousel feature.
 */

import fc from 'fast-check';

/**
 * Default configuration for property-based tests
 * Minimum 100 iterations as specified in the design document
 */
export const DEFAULT_PROPERTY_TEST_CONFIG = {
  numRuns: 100,
  verbose: process.env.VERBOSE_TESTS === 'true',
  seed: process.env.TEST_SEED ? parseInt(process.env.TEST_SEED) : undefined,
};

/**
 * Arbitraries for generating test data
 */
export const arbitraries = {
  /**
   * Generate a valid promotion ID (UUID format)
   */
  promotionId: () => fc.uuid(),

  /**
   * Generate an array of promotion IDs
   */
  promotionIds: (options?: { minLength?: number; maxLength?: number }) =>
    fc.array(fc.uuid(), {
      minLength: options?.minLength ?? 0,
      maxLength: options?.maxLength ?? 20,
    }),

  /**
   * Generate a carousel-sized array (0-10 items)
   */
  carouselIds: () =>
    fc.array(fc.uuid(), {
      minLength: 0,
      maxLength: 10,
    }),

  /**
   * Generate an oversized carousel array (11+ items)
   */
  oversizedCarouselIds: () =>
    fc.array(fc.uuid(), {
      minLength: 11,
      maxLength: 20,
    }),

  /**
   * Generate an array with potential duplicates
   */
  idsWithDuplicates: () =>
    fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }).chain((ids) =>
      fc.shuffledSubarray(ids, { minLength: ids.length, maxLength: ids.length * 2 })
    ),

  /**
   * Generate malformed input data
   */
  malformedInput: () =>
    fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant('not-an-array'),
      fc.integer(),
      fc.object(),
      fc.array(fc.integer()), // Array of wrong type
      fc.array(fc.oneof(fc.string(), fc.integer(), fc.constant(null))) // Mixed types
    ),

  /**
   * Generate a promotion object
   */
  promotion: () =>
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      description: fc.string({ maxLength: 500 }),
      discountType: fc.constantFrom('PERCENTAGE', 'FIXED_AMOUNT'),
      discountValue: fc.double({ min: 0, max: 100 }),
      startDate: fc.date().map((d) => d.toISOString()),
      endDate: fc.date().map((d) => d.toISOString()),
      isActive: fc.boolean(),
    }),

  /**
   * Generate an array of promotions
   */
  promotions: (options?: { minLength?: number; maxLength?: number }) =>
    fc.array(arbitraries.promotion(), {
      minLength: options?.minLength ?? 0,
      maxLength: options?.maxLength ?? 50,
    }),
};

/**
 * Helper to run a property test with default configuration
 */
export function runPropertyTest<T>(
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | Promise<boolean>,
  config?: Partial<typeof DEFAULT_PROPERTY_TEST_CONFIG>
): void {
  const syncPredicate = (value: T) => {
    const result = predicate(value)
    return typeof result === 'boolean' ? result : true
  }
  fc.assert(
    fc.property(arbitrary, syncPredicate),
    { ...DEFAULT_PROPERTY_TEST_CONFIG, ...config }
  );
}

/**
 * Helper to create a property test with custom configuration
 */
export function createPropertyTest<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | Promise<boolean>,
  config?: Partial<typeof DEFAULT_PROPERTY_TEST_CONFIG>
) {
  return {
    name,
    run: () => runPropertyTest(arbitrary, predicate, config),
  };
}
