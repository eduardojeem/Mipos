/**
 * Unit tests for error-state types and classification utility
 * 
 * Tests error classification, user-friendly messaging, and retry logic
 * according to requirements 1.4, 2.1
 */

import { describe, it, expect } from 'vitest';
import {
  classifyError,
  isRetryableErrorType,
  getErrorMessage,
  type ErrorState,
  type ErrorType,
} from './error-state';

describe('classifyError', () => {
  describe('timeout errors', () => {
    it('should classify AbortError as timeout', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';

      const result = classifyError(error);

      expect(result.type).toBe('timeout');
      expect(result.message).toBe('The request timed out. Please try again.');
      expect(result.retryable).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should include context in timeout error', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      const context = { url: '/api/test', method: 'GET', attempt: 2 };

      const result = classifyError(error, context);

      expect(result.context).toEqual(context);
    });
  });

  describe('network errors', () => {
    it('should classify TypeError with "fetch" as network error', () => {
      const error = new TypeError('Failed to fetch');

      const result = classifyError(error);

      expect(result.type).toBe('network');
      expect(result.message).toBe('Network error. Please check your connection and try again.');
      expect(result.retryable).toBe(true);
    });

    it('should classify TypeError with "Fetch" (case insensitive) as network error', () => {
      const error = new TypeError('Network request failed during Fetch');

      const result = classifyError(error);

      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
    });

    it('should include context in network error', () => {
      const error = new TypeError('Failed to fetch');
      const context = { url: '/api/data', method: 'POST' };

      const result = classifyError(error, context);

      expect(result.context).toEqual(context);
    });
  });

  describe('authentication errors (401)', () => {
    it('should classify 401 status as auth error', () => {
      const error = new Error('Unauthorized') as Error & { statusCode: number };
      error.statusCode = 401;

      const result = classifyError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toBe('Your session has expired. Please log in again.');
      expect(result.statusCode).toBe(401);
      expect(result.retryable).toBe(false);
    });

    it('should classify Response with 401 status as auth error', () => {
      const response = { status: 401 };

      const result = classifyError(response);

      expect(result.type).toBe('auth');
      expect(result.statusCode).toBe(401);
      expect(result.retryable).toBe(false);
    });

    it('should classify error with status property as auth error', () => {
      const error = new Error('Unauthorized') as Error & { status: number };
      error.status = 401;

      const result = classifyError(error);

      expect(result.type).toBe('auth');
      expect(result.statusCode).toBe(401);
      expect(result.retryable).toBe(false);
    });
  });

  describe('permission errors (403)', () => {
    it('should classify 403 status as permission error', () => {
      const error = new Error('Forbidden') as Error & { statusCode: number };
      error.statusCode = 403;

      const result = classifyError(error);

      expect(result.type).toBe('permission');
      expect(result.message).toBe("You don't have permission to access this resource.");
      expect(result.statusCode).toBe(403);
      expect(result.retryable).toBe(false);
    });

    it('should classify Response with 403 status as permission error', () => {
      const response = { status: 403 };

      const result = classifyError(response);

      expect(result.type).toBe('permission');
      expect(result.statusCode).toBe(403);
      expect(result.retryable).toBe(false);
    });
  });

  describe('timeout errors (408)', () => {
    it('should classify 408 status as timeout error', () => {
      const error = new Error('Request Timeout') as Error & { statusCode: number };
      error.statusCode = 408;

      const result = classifyError(error);

      expect(result.type).toBe('timeout');
      expect(result.message).toBe('The request timed out. Please try again.');
      expect(result.statusCode).toBe(408);
      expect(result.retryable).toBe(true);
    });
  });

  describe('rate limit errors (429)', () => {
    it('should classify 429 status as server error with custom message', () => {
      const error = new Error('Too Many Requests') as Error & { statusCode: number };
      error.statusCode = 429;

      const result = classifyError(error);

      expect(result.type).toBe('server');
      expect(result.message).toBe('Too many requests. Please try again in a moment.');
      expect(result.statusCode).toBe(429);
      expect(result.retryable).toBe(true);
    });
  });

  describe('client errors (4xx)', () => {
    it('should classify 400 as unknown error (not retryable)', () => {
      const error = new Error('Bad Request') as Error & { statusCode: number };
      error.statusCode = 400;

      const result = classifyError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Request failed with status 400');
      expect(result.statusCode).toBe(400);
      expect(result.retryable).toBe(false);
    });

    it('should classify 404 as unknown error (not retryable)', () => {
      const error = new Error('Not Found') as Error & { statusCode: number };
      error.statusCode = 404;

      const result = classifyError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Request failed with status 404');
      expect(result.statusCode).toBe(404);
      expect(result.retryable).toBe(false);
    });

    it('should classify 422 as unknown error (not retryable)', () => {
      const error = new Error('Unprocessable Entity') as Error & { statusCode: number };
      error.statusCode = 422;

      const result = classifyError(error);

      expect(result.type).toBe('unknown');
      expect(result.statusCode).toBe(422);
      expect(result.retryable).toBe(false);
    });
  });

  describe('server errors (5xx)', () => {
    it('should classify 500 as server error', () => {
      const error = new Error('Internal Server Error') as Error & { statusCode: number };
      error.statusCode = 500;

      const result = classifyError(error);

      expect(result.type).toBe('server');
      expect(result.message).toBe('Server error. Please try again in a moment.');
      expect(result.statusCode).toBe(500);
      expect(result.retryable).toBe(true);
    });

    it('should classify 502 as server error', () => {
      const error = new Error('Bad Gateway') as Error & { statusCode: number };
      error.statusCode = 502;

      const result = classifyError(error);

      expect(result.type).toBe('server');
      expect(result.statusCode).toBe(502);
      expect(result.retryable).toBe(true);
    });

    it('should classify 503 as server error', () => {
      const error = new Error('Service Unavailable') as Error & { statusCode: number };
      error.statusCode = 503;

      const result = classifyError(error);

      expect(result.type).toBe('server');
      expect(result.statusCode).toBe(503);
      expect(result.retryable).toBe(true);
    });

    it('should classify 504 as server error', () => {
      const error = new Error('Gateway Timeout') as Error & { statusCode: number };
      error.statusCode = 504;

      const result = classifyError(error);

      expect(result.type).toBe('server');
      expect(result.statusCode).toBe(504);
      expect(result.retryable).toBe(true);
    });
  });

  describe('unknown errors', () => {
    it('should classify generic Error as unknown', () => {
      const error = new Error('Something went wrong');

      const result = classifyError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Something went wrong');
      expect(result.retryable).toBe(true);
    });

    it('should classify Error without message as unknown with default message', () => {
      const error = new Error();

      const result = classifyError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.retryable).toBe(true);
    });

    it('should classify string error as unknown', () => {
      const error = 'Something went wrong';

      const result = classifyError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Something went wrong');
      expect(result.retryable).toBe(true);
    });

    it('should classify null as unknown', () => {
      const result = classifyError(null);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.retryable).toBe(true);
    });

    it('should classify undefined as unknown', () => {
      const result = classifyError(undefined);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.retryable).toBe(true);
    });

    it('should classify plain object without status as unknown', () => {
      const error = { message: 'Custom error' };

      const result = classifyError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.retryable).toBe(true);
    });
  });

  describe('context preservation', () => {
    it('should preserve context for all error types', () => {
      const context = {
        url: '/api/superadmin/stats',
        method: 'GET',
        attempt: 3,
      };

      const networkError = new TypeError('Failed to fetch');
      const networkResult = classifyError(networkError, context);
      expect(networkResult.context).toEqual(context);

      const authError = new Error('Unauthorized') as Error & { statusCode: number };
      authError.statusCode = 401;
      const authResult = classifyError(authError, context);
      expect(authResult.context).toEqual(context);

      const serverError = new Error('Server Error') as Error & { statusCode: number };
      serverError.statusCode = 500;
      const serverResult = classifyError(serverError, context);
      expect(serverResult.context).toEqual(context);
    });

    it('should handle missing context gracefully', () => {
      const error = new TypeError('Failed to fetch');

      const result = classifyError(error);

      expect(result.context).toBeUndefined();
    });

    it('should handle partial context', () => {
      const context = { url: '/api/test' };
      const error = new TypeError('Failed to fetch');

      const result = classifyError(error, context);

      expect(result.context).toEqual(context);
    });
  });

  describe('timestamp', () => {
    it('should include timestamp for all errors', () => {
      const before = new Date();
      const error = new TypeError('Failed to fetch');
      const result = classifyError(error);
      const after = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

describe('isRetryableErrorType', () => {
  it('should return true for network errors', () => {
    expect(isRetryableErrorType('network')).toBe(true);
  });

  it('should return false for auth errors', () => {
    expect(isRetryableErrorType('auth')).toBe(false);
  });

  it('should return false for permission errors', () => {
    expect(isRetryableErrorType('permission')).toBe(false);
  });

  it('should return true for timeout errors', () => {
    expect(isRetryableErrorType('timeout')).toBe(true);
  });

  it('should return true for server errors', () => {
    expect(isRetryableErrorType('server')).toBe(true);
  });

  it('should return true for unknown errors', () => {
    expect(isRetryableErrorType('unknown')).toBe(true);
  });
});

describe('getErrorMessage', () => {
  it('should return correct message for network error', () => {
    expect(getErrorMessage('network')).toBe('Network error. Please check your connection and try again.');
  });

  it('should return correct message for auth error', () => {
    expect(getErrorMessage('auth')).toBe('Your session has expired. Please log in again.');
  });

  it('should return correct message for permission error', () => {
    expect(getErrorMessage('permission')).toBe("You don't have permission to access this resource.");
  });

  it('should return correct message for timeout error', () => {
    expect(getErrorMessage('timeout')).toBe('The request timed out. Please try again.');
  });

  it('should return correct message for server error', () => {
    expect(getErrorMessage('server')).toBe('Server error. Please try again in a moment.');
  });

  it('should return correct message for unknown error', () => {
    expect(getErrorMessage('unknown')).toBe('An unexpected error occurred. Please try again.');
  });
});

describe('integration scenarios', () => {
  it('should handle real-world fetch failure scenario', () => {
    const error = new TypeError('Failed to fetch');
    const context = {
      url: '/api/superadmin/stats',
      method: 'GET',
      attempt: 1,
    };

    const result = classifyError(error, context);

    expect(result).toMatchObject({
      type: 'network',
      message: 'Network error. Please check your connection and try again.',
      retryable: true,
      context,
    });
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should handle expired session scenario', () => {
    const response = { status: 401 };
    const context = {
      url: '/api/superadmin/stats',
      method: 'GET',
    };

    const result = classifyError(response, context);

    expect(result).toMatchObject({
      type: 'auth',
      message: 'Your session has expired. Please log in again.',
      statusCode: 401,
      retryable: false,
      context,
    });
  });

  it('should handle permission denied scenario', () => {
    const error = new Error('Forbidden') as Error & { statusCode: number };
    error.statusCode = 403;
    const context = {
      url: '/api/superadmin/stats',
      method: 'GET',
    };

    const result = classifyError(error, context);

    expect(result).toMatchObject({
      type: 'permission',
      message: "You don't have permission to access this resource.",
      statusCode: 403,
      retryable: false,
      context,
    });
  });

  it('should handle server error scenario', () => {
    const error = new Error('Internal Server Error') as Error & { statusCode: number };
    error.statusCode = 500;
    const context = {
      url: '/api/superadmin/stats',
      method: 'GET',
      attempt: 2,
    };

    const result = classifyError(error, context);

    expect(result).toMatchObject({
      type: 'server',
      message: 'Server error. Please try again in a moment.',
      statusCode: 500,
      retryable: true,
      context,
    });
  });

  it('should handle timeout scenario', () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    const context = {
      url: '/api/superadmin/stats',
      method: 'GET',
      attempt: 1,
    };

    const result = classifyError(error, context);

    expect(result).toMatchObject({
      type: 'timeout',
      message: 'The request timed out. Please try again.',
      retryable: true,
      context,
    });
  });
});

describe('error classification consistency', () => {
  it('should consistently classify the same error', () => {
    const error = new TypeError('Failed to fetch');
    const context = { url: '/api/test', method: 'GET' };

    const result1 = classifyError(error, context);
    const result2 = classifyError(error, context);

    expect(result1.type).toBe(result2.type);
    expect(result1.message).toBe(result2.message);
    expect(result1.retryable).toBe(result2.retryable);
  });

  it('should classify different error instances consistently', () => {
    const error1 = new TypeError('Failed to fetch');
    const error2 = new TypeError('Failed to fetch');

    const result1 = classifyError(error1);
    const result2 = classifyError(error2);

    expect(result1.type).toBe(result2.type);
    expect(result1.message).toBe(result2.message);
    expect(result1.retryable).toBe(result2.retryable);
  });
});
