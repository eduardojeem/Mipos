/**
 * Carousel Validator
 * 
 * Provides validation and sanitization for carousel data.
 * Ensures data integrity and security before database operations.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Maximum number of items allowed in carousel
 */
export const MAX_CAROUSEL_ITEMS = 10;

/**
 * Validation error structure
 */
export interface ValidationError {
  code: string;
  message: string;
  field: string;
  details?: any;
}

/**
 * Validation warning structure
 */
export interface ValidationWarning {
  code: string;
  message: string;
  field: string;
  details?: any;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * CarouselValidator class
 * 
 * Provides comprehensive validation and sanitization for carousel operations
 */
export class CarouselValidator {
  /**
   * Validate an array of promotion IDs
   * 
   * Checks:
   * - Type validation (must be array)
   * - Element type validation (all elements must be strings)
   * - Length validation (max 10 items)
   * - Duplicate detection
   * 
   * @param ids - Array of promotion IDs to validate
   * @returns ValidationResult with errors and warnings
   */
  validateIds(ids: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Type check - must be an array
    if (!Array.isArray(ids)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'IDs must be an array',
        field: 'ids',
        details: { received: typeof ids },
      });
      return { valid: false, errors, warnings };
    }

    // Element type check - all elements must be strings
    const nonStringElements = ids.filter((id) => typeof id !== 'string');
    if (nonStringElements.length > 0) {
      errors.push({
        code: 'INVALID_ELEMENT_TYPE',
        message: 'All IDs must be strings',
        field: 'ids',
        details: {
          invalidElements: nonStringElements,
          count: nonStringElements.length,
        },
      });
    }

    // Length check - max 10 items
    if (ids.length > MAX_CAROUSEL_ITEMS) {
      errors.push({
        code: 'MAX_LIMIT_EXCEEDED',
        message: `Maximum ${MAX_CAROUSEL_ITEMS} items allowed`,
        field: 'ids',
        details: {
          received: ids.length,
          maximum: MAX_CAROUSEL_ITEMS,
        },
      });
    }

    // Empty string check
    const emptyStrings = ids.filter((id) => typeof id === 'string' && id.trim() === '');
    if (emptyStrings.length > 0) {
      errors.push({
        code: 'EMPTY_IDS',
        message: 'IDs cannot be empty strings',
        field: 'ids',
        details: { count: emptyStrings.length },
      });
    }

    // Duplicates check
    const duplicates = this.validateDuplicates(ids);
    if (duplicates.length > 0) {
      warnings.push({
        code: 'DUPLICATES_FOUND',
        message: `Duplicate IDs will be removed: ${duplicates.join(', ')}`,
        field: 'ids',
        details: { duplicates },
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect duplicate IDs in an array
   * 
   * @param ids - Array of IDs to check
   * @returns Array of duplicate IDs
   */
  validateDuplicates(ids: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const id of ids) {
      if (seen.has(id)) {
        duplicates.add(id);
      }
      seen.add(id);
    }

    return Array.from(duplicates);
  }

  /**
   * Sanitize input data
   * 
   * - Ensures input is an array
   * - Filters out non-string elements
   * - Trims whitespace
   * - Removes empty strings
   * - Removes duplicates while preserving order
   * - Limits to MAX_CAROUSEL_ITEMS
   * 
   * @param input - Raw input data
   * @returns Sanitized array of IDs
   */
  sanitizeInput(input: any): string[] {
    // Ensure it's an array
    if (!Array.isArray(input)) {
      return [];
    }

    // Filter to only string elements, trim, and remove empty
    const stringIds = input
      .filter((id) => typeof id === 'string')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    // Remove duplicates while preserving order (first occurrence)
    const uniqueIds = Array.from(new Set(stringIds));

    // Limit to maximum allowed items
    return uniqueIds.slice(0, MAX_CAROUSEL_ITEMS);
  }

  /**
   * Validate that a promotion exists in the database
   * 
   * @param id - Promotion ID to check
   * @returns Promise<boolean> - true if exists, false otherwise
   */
  async validatePromotionExists(id: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase client not initialized, skipping existence check');
      return true; // Assume valid if we can't check
    }

    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('id')
        .eq('id', id)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking promotion existence:', error);
      return false;
    }
  }

  /**
   * Validate that all promotion IDs exist in the database
   * 
   * @param ids - Array of promotion IDs to check
   * @returns Promise<ValidationResult> - Result with invalid IDs in errors
   */
  async validateAllPromotionsExist(ids: string[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!supabase) {
      warnings.push({
        code: 'SUPABASE_NOT_INITIALIZED',
        message: 'Cannot validate promotion existence - Supabase not initialized',
        field: 'ids',
      });
      return { valid: true, errors, warnings };
    }

    try {
      // Query all promotions with these IDs
      const { data: promotions, error } = await supabase
        .from('promotions')
        .select('id')
        .in('id', ids);

      if (error) {
        errors.push({
          code: 'DATABASE_ERROR',
          message: 'Error querying promotions',
          field: 'ids',
          details: { error: error.message },
        });
        return { valid: false, errors, warnings };
      }

      // Check which IDs are missing
      const existingIds = new Set(promotions?.map((p) => p.id) || []);
      const missingIds = ids.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        errors.push({
          code: 'INVALID_PROMOTION_IDS',
          message: `The following promotion IDs do not exist: ${missingIds.join(', ')}`,
          field: 'ids',
          details: { missingIds },
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Unexpected error during validation',
        field: 'ids',
        details: { error: error.message },
      });
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Normalize positions to sequential order [0, 1, 2, ...]
   * 
   * @param items - Array of items with position property
   * @returns Array with normalized positions
   */
  normalizePositions<T extends { position: number }>(items: T[]): T[] {
    return items
      .sort((a, b) => a.position - b.position)
      .map((item, index) => ({
        ...item,
        position: index,
      }));
  }

  /**
   * Comprehensive validation for carousel save operation
   * 
   * Performs all validations:
   * - Type and format validation
   * - Length validation
   * - Duplicate detection
   * - Existence validation (if Supabase available)
   * 
   * @param ids - Array of promotion IDs
   * @returns Promise<ValidationResult> - Complete validation result
   */
  async validateForSave(ids: any): Promise<ValidationResult> {
    // First, validate format and structure
    const formatValidation = this.validateIds(ids);
    if (!formatValidation.valid) {
      return formatValidation;
    }

    // Sanitize the input
    const sanitizedIds = this.sanitizeInput(ids);

    // Then validate existence in database
    const existenceValidation = await this.validateAllPromotionsExist(sanitizedIds);

    // Combine results
    return {
      valid: formatValidation.valid && existenceValidation.valid,
      errors: [...formatValidation.errors, ...existenceValidation.errors],
      warnings: [...formatValidation.warnings, ...existenceValidation.warnings],
    };
  }
}

// Export singleton instance
export const carouselValidator = new CarouselValidator();
