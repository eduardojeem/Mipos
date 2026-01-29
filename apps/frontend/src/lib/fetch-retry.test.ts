/**
 * Unit tests for fetch-retry utility
 * 
 * Tests the retry logic, exponential backoff, and error classification
 * according to requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchWithRetry,
  calculateExponentialBackoff,
  isRetryableError,
} from './fetch-retry';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return result on successful first attempt', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ data: 'success' });

    const promise = fetchWithRetry(mockFetcher);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ data: 'success' });
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error and succeed on second attempt', async () => {
    const mockFetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ data: 'success' });

    const promise = fetchWithRetry(mockFetcher, { maxAttempts: 3 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ data: 'success' });
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('should retry exactly 3 times for network errors before failing', async () => {
    const mockFetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = fetchWithRetry(mockFetcher, { maxAttempts: 3 }).catch((error) => error);
    await vi.runAllTimersAsync();
    const error = await promise;

    expect(mockFetcher).toHaveBeenCalledTimes(3);
    expect(error).toBeInstanceOf(TypeError);
  });

  it('should use exponential backoff delays (1s, 2s, 4s)', async () => {
    const delays: number[] = [];
    const mockFetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = fetchWithRetry(mockFetcher, {
      maxAttempts: 3,
      initialDelay: 1000,
      onRetry: (_error, _attempt, delay) => delays.push(delay),
    }).catch(() => {
      // Expected to fail
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(delays).toEqual([1000, 2000]);
  });

  it('should invoke onRetry callback before each retry', async () => {
    const onRetry = vi.fn();
    const mockFetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = fetchWithRetry(mockFetcher, {
      maxAttempts: 3,
      onRetry,
    }).catch(() => {
      // Expected to fail
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2); // Called before 2nd and 3rd attempts
    expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(TypeError), 1, 1000);
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(TypeError), 2, 2000);
  });

  it('should not retry on 4xx client errors (except 408, 429)', async () => {
    const error = new Error('Bad Request');
    const mockFetcher = vi.fn().mockRejectedValue(error);

    const promise = fetchWithRetry(mockFetcher, {
      maxAttempts: 3,
      shouldRetry: (err) => {
        // Simulate 400 error - should not retry
        return false;
      },
    }).catch(() => {
      // Expected to fail
    });

    await vi.runAllTimersAsync();
    await promise;
    
    expect(mockFetcher).toHaveBeenCalledTimes(1); // No retries
  });

  it('should retry on timeout errors (AbortError)', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    
    const mockFetcher = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce({ data: 'success' });

    const promise = fetchWithRetry(mockFetcher, { maxAttempts: 3 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ data: 'success' });
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('should respect custom maxAttempts option', async () => {
    const mockFetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = fetchWithRetry(mockFetcher, { maxAttempts: 5 }).catch(() => {
      // Expected to fail
    });

    await vi.runAllTimersAsync();
    await promise;
    
    expect(mockFetcher).toHaveBeenCalledTimes(5);
  });

  it('should respect custom initialDelay option', async () => {
    const delays: number[] = [];
    const mockFetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = fetchWithRetry(mockFetcher, {
      maxAttempts: 2,
      initialDelay: 500,
      onRetry: (_error, _attempt, delay) => delays.push(delay),
    }).catch(() => {
      // Expected to fail
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(delays).toEqual([500]); // First retry uses initialDelay
  });

  it('should cap delay at maxDelay', async () => {
    const delays: number[] = [];
    const mockFetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = fetchWithRetry(mockFetcher, {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 3000,
      onRetry: (_error, _attempt, delay) => delays.push(delay),
    }).catch(() => {
      // Expected to fail
    });

    await vi.runAllTimersAsync();
    await promise;

    // Delays should be: 1000, 2000, 3000 (capped), 3000 (capped)
    expect(delays).toEqual([1000, 2000, 3000, 3000]);
  });
});

describe('calculateExponentialBackoff', () => {
  it('should calculate correct delay for attempt 1', () => {
    const delay = calculateExponentialBackoff(1, 1000, 10000, 2);
    expect(delay).toBe(1000); // 1000 * 2^0 = 1000
  });

  it('should calculate correct delay for attempt 2', () => {
    const delay = calculateExponentialBackoff(2, 1000, 10000, 2);
    expect(delay).toBe(2000); // 1000 * 2^1 = 2000
  });

  it('should calculate correct delay for attempt 3', () => {
    const delay = calculateExponentialBackoff(3, 1000, 10000, 2);
    expect(delay).toBe(4000); // 1000 * 2^2 = 4000
  });

  it('should cap delay at maxDelay', () => {
    const delay = calculateExponentialBackoff(10, 1000, 5000, 2);
    expect(delay).toBe(5000); // Would be 512000, but capped at 5000
  });

  it('should handle different multipliers', () => {
    const delay = calculateExponentialBackoff(3, 100, 10000, 3);
    expect(delay).toBe(900); // 100 * 3^2 = 900
  });

  it('should handle edge case of attempt 0', () => {
    const delay = calculateExponentialBackoff(0, 1000, 10000, 2);
    expect(delay).toBe(500); // 1000 * 2^-1 = 500
  });
});

describe('isRetryableError', () => {
  describe('network errors', () => {
    it('should retry on TypeError with "fetch" in message', () => {
      const error = new TypeError('Failed to fetch');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should retry on TypeError with "Fetch" in message (case insensitive)', () => {
      const error = new TypeError('Network request failed during Fetch');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should not retry on TypeError without "fetch" in message', () => {
      const error = new TypeError('Cannot read property of undefined');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('timeout errors', () => {
    it('should retry on AbortError', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('HTTP status codes', () => {
    it('should retry on 500 Internal Server Error', () => {
      const error = new Error('Server error');
      const response = { status: 500 } as Response;
      expect(isRetryableError(error, response)).toBe(true);
    });

    it('should retry on 502 Bad Gateway', () => {
      const error = new Error('Bad gateway');
      const response = { status: 502 } as Response;
      expect(isRetryableError(error, response)).toBe(true);
    });

    it('should retry on 503 Service Unavailable', () => {
      const error = new Error('Service unavailable');
      const response = { status: 503 } as Response;
      expect(isRetryableError(error, response)).toBe(true);
    });

    it('should retry on 504 Gateway Timeout', () => {
      const error = new Error('Gateway timeout');
      const response = { status: 504 } as Response;
      expect(isRetryableError(error, response)).toBe(true);
    });

    it('should retry on 408 Request Timeout', () => {
      const error = new Error('Request timeout');
      const response = { status: 408 } as Response;
      expect(isRetryableError(error, response)).toBe(true);
    });

    it('should retry on 429 Too Many Requests', () => {
      const error = new Error('Too many requests');
      const response = { status: 429 } as Response;
      expect(isRetryableError(error, response)).toBe(true);
    });

    it('should not retry on 400 Bad Request', () => {
      const error = new Error('Bad request');
      const response = { status: 400 } as Response;
      expect(isRetryableError(error, response)).toBe(false);
    });

    it('should not retry on 401 Unauthorized', () => {
      const error = new Error('Unauthorized');
      const response = { status: 401 } as Response;
      expect(isRetryableError(error, response)).toBe(false);
    });

    it('should not retry on 403 Forbidden', () => {
      const error = new Error('Forbidden');
      const response = { status: 403 } as Response;
      expect(isRetryableError(error, response)).toBe(false);
    });

    it('should not retry on 404 Not Found', () => {
      const error = new Error('Not found');
      const response = { status: 404 } as Response;
      expect(isRetryableError(error, response)).toBe(false);
    });

    it('should not retry on 422 Unprocessable Entity', () => {
      const error = new Error('Validation error');
      const response = { status: 422 } as Response;
      expect(isRetryableError(error, response)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should not retry on generic Error without response', () => {
      const error = new Error('Generic error');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should not retry on ReferenceError', () => {
      const error = new ReferenceError('Variable not defined');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should handle 2xx success codes (should not retry)', () => {
      const error = new Error('Success but treated as error');
      const response = { status: 200 } as Response;
      expect(isRetryableError(error, response)).toBe(false);
    });

    it('should handle 3xx redirect codes (should not retry)', () => {
      const error = new Error('Redirect');
      const response = { status: 301 } as Response;
      expect(isRetryableError(error, response)).toBe(false);
    });
  });
});

describe('integration tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should handle mixed success and failure scenarios', async () => {
    let callCount = 0;
    const mockFetcher = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      if (callCount === 2) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Promise.resolve({ data: 'success' });
    });

    const promise = fetchWithRetry(mockFetcher, { maxAttempts: 3 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ data: 'success' });
    expect(mockFetcher).toHaveBeenCalledTimes(3);
  });

  it('should properly handle async errors in fetcher', async () => {
    const mockFetcher = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw new TypeError('Failed to fetch');
    });

    const promise = fetchWithRetry(mockFetcher, { maxAttempts: 2 }).catch((error) => error);

    await vi.runAllTimersAsync();
    const error = await promise;
    
    expect(mockFetcher).toHaveBeenCalledTimes(2);
    expect(error).toBeInstanceOf(TypeError);
  });

  it('should work with real fetch-like operations', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

    const promise = fetchWithRetry(
      async () => {
        const response = await mockFetch('/api/test');
        return response.json();
      },
      { maxAttempts: 3 }
    );

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ data: 'test' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
