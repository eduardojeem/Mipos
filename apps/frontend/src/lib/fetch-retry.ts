/**
 * Fetch Retry Utility with Exponential Backoff
 * 
 * This module provides retry logic for fetch requests with configurable
 * exponential backoff. It handles network errors, timeouts, and server errors
 * according to the retry policy defined in the design document.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

/**
 * Options for configuring retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number;
  /** Initial delay in milliseconds before first retry (default: 1000ms) */
  initialDelay: number;
  /** Maximum delay in milliseconds between retries (default: 10000ms) */
  maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;
  /** Function to determine if an error should trigger a retry */
  shouldRetry: (error: Error, attempt: number) => boolean;
  /** Optional callback invoked before each retry attempt */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error) => isRetryableError(error),
};

/**
 * Executes a fetch operation with automatic retry logic and exponential backoff.
 * 
 * @template T - The expected return type of the fetcher function
 * @param fetcher - Async function that performs the fetch operation
 * @param options - Partial retry options (merged with defaults)
 * @returns Promise that resolves with the fetcher's result
 * @throws The last error encountered if all retry attempts fail
 * 
 * @example
 * ```typescript
 * const data = await fetchWithRetry(
 *   () => fetch('/api/data').then(r => r.json()),
 *   { maxAttempts: 3, onRetry: (err, attempt, delay) => console.log(`Retry ${attempt}`) }
 * );
 * ```
 */
export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const mergedOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= mergedOptions.maxAttempts; attempt++) {
    try {
      const result = await fetcher();
      return result;
    } catch (error) {
      lastError = error as Error;

      // If this was the last attempt, throw the error
      if (attempt >= mergedOptions.maxAttempts) {
        throw error;
      }

      // Check if we should retry this error
      if (!mergedOptions.shouldRetry(lastError, attempt)) {
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateExponentialBackoff(
        attempt,
        mergedOptions.initialDelay,
        mergedOptions.maxDelay,
        mergedOptions.backoffMultiplier
      );

      // Invoke retry callback if provided
      mergedOptions.onRetry?.(lastError, attempt, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Calculates the delay for exponential backoff.
 * 
 * The delay increases exponentially with each attempt:
 * - Attempt 1: initialDelay * multiplier^0 = initialDelay
 * - Attempt 2: initialDelay * multiplier^1 = initialDelay * 2
 * - Attempt 3: initialDelay * multiplier^2 = initialDelay * 4
 * 
 * @param attempt - Current attempt number (1-indexed)
 * @param initialDelay - Base delay in milliseconds
 * @param maxDelay - Maximum allowed delay in milliseconds
 * @param multiplier - Exponential growth factor
 * @returns Calculated delay in milliseconds, capped at maxDelay
 * 
 * @example
 * ```typescript
 * calculateExponentialBackoff(1, 1000, 10000, 2) // Returns 1000ms
 * calculateExponentialBackoff(2, 1000, 10000, 2) // Returns 2000ms
 * calculateExponentialBackoff(3, 1000, 10000, 2) // Returns 4000ms
 * ```
 */
export function calculateExponentialBackoff(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  // Calculate exponential delay: initialDelay * multiplier^(attempt - 1)
  const delay = initialDelay * Math.pow(multiplier, attempt - 1);
  
  // Cap at maximum delay
  return Math.min(delay, maxDelay);
}

/**
 * Determines if an error should trigger a retry attempt.
 * 
 * Retry logic:
 * - Network errors (TypeError with 'fetch' in message): RETRY
 * - Timeout errors (AbortError): RETRY
 * - 5xx server errors: RETRY
 * - 408 Request Timeout: RETRY
 * - 429 Too Many Requests: RETRY
 * - 4xx client errors (except 408, 429): NO RETRY
 * - Other errors: NO RETRY
 * 
 * @param error - The error to evaluate
 * @param response - Optional Response object if available
 * @returns true if the error should trigger a retry, false otherwise
 * 
 * Requirements: 3.3, 3.4
 */
export function isRetryableError(error: Error, response?: Response): boolean {
  // Check for explicit doNotRetry flag (e.g., set by user abort handler)
  if ((error as { doNotRetry?: boolean }).doNotRetry) {
    return false;
  }

  // Network errors are retryable (e.g., "Failed to fetch", "Network request failed")
  if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
    return true;
  }

  // Timeout errors are retryable
  if (error.name === 'AbortError') {
    return true;
  }

  // If we have a response, check the status code
  if (response) {
    const status = response.status;

    // 5xx server errors are retryable
    if (status >= 500 && status < 600) {
      return true;
    }

    // 408 Request Timeout and 429 Too Many Requests are retryable
    if (status === 408 || status === 429) {
      return true;
    }

    // 4xx client errors (except 408, 429) are NOT retryable
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // For errors without a response, default to not retrying
  // (unless they matched one of the specific cases above)
  return false;
}

/**
 * Utility function to sleep for a specified duration.
 * 
 * @param ms - Duration to sleep in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
