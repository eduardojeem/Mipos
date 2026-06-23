import { NextResponse } from 'next/server';

/**
 * Bulk operation validator - ensures operations don't exceed size limits
 */

export const BULK_LIMITS = {
  MAX_ITEMS_PER_REQUEST: 100,
  MAX_BATCH_SIZE: 1000,
  MAX_FILE_SIZE_MB: 10,
  MAX_FIELDS_PER_ITEM: 50,
};

interface BulkValidationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function validateBulkRequest(
  items: unknown[],
  options?: {
    maxItems?: number;
    maxFieldsPerItem?: number;
  }
): { valid: boolean; error?: BulkValidationError } {
  const maxItems = options?.maxItems || BULK_LIMITS.MAX_ITEMS_PER_REQUEST;
  const maxFields = options?.maxFieldsPerItem || BULK_LIMITS.MAX_FIELDS_PER_ITEM;

  // Check if it's an array
  if (!Array.isArray(items)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'Request body must contain an array of items',
      },
    };
  }

  // Check array length
  if (items.length === 0) {
    return {
      valid: false,
      error: {
        code: 'EMPTY_ARRAY',
        message: 'Array must contain at least 1 item',
      },
    };
  }

  if (items.length > maxItems) {
    return {
      valid: false,
      error: {
        code: 'ARRAY_TOO_LARGE',
        message: `Cannot process more than ${maxItems} items per request`,
        details: {
          requested: items.length,
          maximum: maxItems,
        },
      },
    };
  }

  // Check each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Check if item is an object
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_ITEM_TYPE',
          message: `Item ${i} must be an object`,
        },
      };
    }

    // Check number of fields
    const fieldCount = Object.keys(item as Record<string, unknown>).length;
    if (fieldCount > maxFields) {
      return {
        valid: false,
        error: {
          code: 'TOO_MANY_FIELDS',
          message: `Item ${i} has too many fields (max ${maxFields})`,
          details: {
            index: i,
            fieldCount,
            maximum: maxFields,
          },
        },
      };
    }
  }

  return { valid: true };
}

export function validateBulkResponse(
  items: unknown[]
): { valid: boolean; error?: BulkValidationError } {
  // Check for max batch size in response
  if (items.length > BULK_LIMITS.MAX_BATCH_SIZE) {
    return {
      valid: false,
      error: {
        code: 'RESPONSE_TOO_LARGE',
        message: `Response contains too many items (max ${BULK_LIMITS.MAX_BATCH_SIZE})`,
      },
    };
  }

  return { valid: true };
}

export function createBulkValidationErrorResponse(error: BulkValidationError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    },
    { status: 400 }
  );
}
