import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCSRFToken,
  validateCSRFToken,
  clearCSRFToken,
  addCSRFHeader
} from '../csrf';

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

describe('CSRF Protection', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getCSRFToken', () => {
    it('should generate a new token', () => {
      const token = getCSRFToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should return the same token on subsequent calls', () => {
      const token1 = getCSRFToken();
      const token2 = getCSRFToken();
      
      expect(token1).toBe(token2);
    });

    it('should store token in sessionStorage', () => {
      const token = getCSRFToken();
      const stored = sessionStorageMock.getItem('csrf_token');
      
      expect(stored).toBeDefined();
      expect(stored).toContain(token);
    });

    it('should generate new token after expiry', () => {
      const token1 = getCSRFToken();
      
      // Simulate expired token
      const expired = {
        token: token1,
        expiresAt: Date.now() - 1000
      };
      sessionStorageMock.setItem('csrf_token', JSON.stringify(expired));
      
      const token2 = getCSRFToken();
      
      expect(token2).not.toBe(token1);
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate correct token', () => {
      const token = getCSRFToken();
      const isValid = validateCSRFToken(token);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid token', () => {
      getCSRFToken(); // Generate a token
      const isValid = validateCSRFToken('invalid-token');
      
      expect(isValid).toBe(false);
    });

    it('should reject empty token', () => {
      const isValid = validateCSRFToken('');
      
      expect(isValid).toBe(false);
    });

    it('should reject expired token', () => {
      const token = getCSRFToken();
      
      // Simulate expired token
      const expired = {
        token,
        expiresAt: Date.now() - 1000
      };
      sessionStorageMock.setItem('csrf_token', JSON.stringify(expired));
      
      const isValid = validateCSRFToken(token);
      
      expect(isValid).toBe(false);
    });
  });

  describe('clearCSRFToken', () => {
    it('should remove token from sessionStorage', () => {
      getCSRFToken(); // Generate a token
      
      expect(sessionStorageMock.getItem('csrf_token')).toBeDefined();
      
      clearCSRFToken();
      
      expect(sessionStorageMock.getItem('csrf_token')).toBeNull();
    });
  });

  describe('addCSRFHeader', () => {
    it('should add CSRF token to headers', () => {
      const token = getCSRFToken();
      const headers = addCSRFHeader();
      
      expect(headers).toHaveProperty('X-CSRF-Token');
      expect((headers as any)['X-CSRF-Token']).toBe(token);
    });

    it('should preserve existing headers', () => {
      const existingHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token'
      };
      
      const headers = addCSRFHeader(existingHeaders);
      
      expect(headers).toHaveProperty('Content-Type');
      expect(headers).toHaveProperty('Authorization');
      expect(headers).toHaveProperty('X-CSRF-Token');
    });
  });
});
