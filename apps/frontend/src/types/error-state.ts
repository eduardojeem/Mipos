/**
 * Error state types and classification utility for comprehensive error handling
 * Feature: fix-superadmin-fetch-error
 */

/**
 * Error types that can occur during fetch operations
 */
export type ErrorType = 'network' | 'auth' | 'permission' | 'timeout' | 'server' | 'unknown';

/**
 * Structured error state with classification and user-friendly messaging
 */
export interface ErrorState {
  /** The type of error that occurred */
  type: ErrorType;
  /** User-friendly error message */
  message: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Whether the error is retryable */
  retryable: boolean;
  /** When the error occurred */
  timestamp: Date;
  /** Additional context about the error */
  context?: {
    url?: string;
    method?: string;
    attempt?: number;
  };
}

/**
 * Error type to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: 'Network error. Please check your connection and try again.',
  auth: 'Your session has expired. Please log in again.',
  permission: "You don't have permission to access this resource.",
  timeout: 'The request timed out. Please try again.',
  server: 'Server error. Please try again in a moment.',
  unknown: 'An unexpected error occurred. Please try again.',
};

/**
 * Determines which error types should be retried
 */
const RETRYABLE_ERRORS: Set<ErrorType> = new Set(['network', 'timeout', 'server', 'unknown']);

/**
 * Classifies an error into a structured ErrorState with user-friendly messaging
 * 
 * @param error - The error to classify
 * @param context - Optional context about the request
 * @returns Structured ErrorState with type, message, and retry information
 * 
 * @example
 * ```typescript
 * try {
 *   await fetch('/api/data');
 * } catch (error) {
 *   const errorState = classifyError(error, { url: '/api/data', method: 'GET' });
 *   console.log(errorState.type); // 'network'
 *   console.log(errorState.message); // 'Network error. Please check your connection and try again.'
 *   console.log(errorState.retryable); // true
 * }
 * ```
 */
export function classifyError(
  error: unknown,
  context?: {
    url?: string;
    method?: string;
    attempt?: number;
  }
): ErrorState {
  const timestamp = new Date();

  // Handle Error objects
  if (error instanceof Error) {
    // Timeout errors (AbortError from timeout controller)
    if (error.name === 'AbortError') {
      return {
        type: 'timeout',
        message: ERROR_MESSAGES.timeout,
        retryable: true,
        timestamp,
        context,
      };
    }

    // Network errors (fetch failed)
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      return {
        type: 'network',
        message: ERROR_MESSAGES.network,
        retryable: true,
        timestamp,
        context,
      };
    }

    // Check if error has a status code property (from Response)
    const errorWithStatus = error as Error & { statusCode?: number; status?: number };
    const statusCode = errorWithStatus.statusCode || errorWithStatus.status;

    if (statusCode) {
      return classifyHttpError(statusCode, timestamp, context);
    }

    // Generic error with message
    return {
      type: 'unknown',
      message: error.message || ERROR_MESSAGES.unknown,
      retryable: true,
      timestamp,
      context,
    };
  }

  // Handle Response objects with error status
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const response = error as { status: number };
    return classifyHttpError(response.status, timestamp, context);
  }

  // Handle plain objects with statusCode
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const errorObj = error as { statusCode: number };
    return classifyHttpError(errorObj.statusCode, timestamp, context);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: 'unknown',
      message: error,
      retryable: true,
      timestamp,
      context,
    };
  }

  // Fallback for unknown error types
  return {
    type: 'unknown',
    message: ERROR_MESSAGES.unknown,
    retryable: true,
    timestamp,
    context,
  };
}

/**
 * Classifies HTTP errors based on status code
 * 
 * @param statusCode - HTTP status code
 * @param timestamp - When the error occurred
 * @param context - Request context
 * @returns Structured ErrorState
 */
function classifyHttpError(
  statusCode: number,
  timestamp: Date,
  context?: {
    url?: string;
    method?: string;
    attempt?: number;
  }
): ErrorState {
  // Authentication errors (401)
  if (statusCode === 401) {
    return {
      type: 'auth',
      message: ERROR_MESSAGES.auth,
      statusCode,
      retryable: false,
      timestamp,
      context,
    };
  }

  // Permission errors (403)
  if (statusCode === 403) {
    return {
      type: 'permission',
      message: ERROR_MESSAGES.permission,
      statusCode,
      retryable: false,
      timestamp,
      context,
    };
  }

  // Timeout errors (408)
  if (statusCode === 408) {
    return {
      type: 'timeout',
      message: ERROR_MESSAGES.timeout,
      statusCode,
      retryable: true,
      timestamp,
      context,
    };
  }

  // Rate limit errors (429) - retryable
  if (statusCode === 429) {
    return {
      type: 'server',
      message: 'Too many requests. Please try again in a moment.',
      statusCode,
      retryable: true,
      timestamp,
      context,
    };
  }

  // Client errors (4xx) - not retryable (except 408, 429 handled above)
  if (statusCode >= 400 && statusCode < 500) {
    return {
      type: 'unknown',
      message: `Request failed with status ${statusCode}`,
      statusCode,
      retryable: false,
      timestamp,
      context,
    };
  }

  // Server errors (5xx) - retryable
  if (statusCode >= 500) {
    return {
      type: 'server',
      message: ERROR_MESSAGES.server,
      statusCode,
      retryable: true,
      timestamp,
      context,
    };
  }

  // Other status codes
  return {
    type: 'unknown',
    message: `Request failed with status ${statusCode}`,
    statusCode,
    retryable: true,
    timestamp,
    context,
  };
}

/**
 * Checks if an error type is retryable
 * 
 * @param errorType - The error type to check
 * @returns true if the error should be retried
 */
export function isRetryableErrorType(errorType: ErrorType): boolean {
  return RETRYABLE_ERRORS.has(errorType);
}

/**
 * Gets the user-friendly message for an error type
 * 
 * @param errorType - The error type
 * @returns User-friendly error message
 */
export function getErrorMessage(errorType: ErrorType): string {
  return ERROR_MESSAGES[errorType];
}
