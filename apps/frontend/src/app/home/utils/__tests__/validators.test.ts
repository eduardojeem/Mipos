/**
 * Unit tests for validator utilities
 * Tests validation functions with various inputs including edge cases
 */

import {
  validateNumber,
  validateArray,
  validateString,
  validateImageUrl,
} from '../validators';

describe('validators', () => {
  describe('validateNumber', () => {
    it('should return fallback for NaN', () => {
      expect(validateNumber(NaN, 0)).toBe(0);
      expect(validateNumber(NaN, 42)).toBe(42);
    });

    it('should return fallback for undefined', () => {
      expect(validateNumber(undefined, 10)).toBe(10);
      expect(validateNumber(undefined, -5)).toBe(-5);
    });

    it('should return fallback for null', () => {
      expect(validateNumber(null, 100)).toBe(100);
      expect(validateNumber(null, 0)).toBe(0);
    });

    it('should return fallback for non-numeric strings', () => {
      expect(validateNumber('abc', 5)).toBe(5);
      expect(validateNumber('not a number', 10)).toBe(10);
    });

    it('should return fallback for Infinity', () => {
      expect(validateNumber(Infinity, 0)).toBe(0);
      expect(validateNumber(-Infinity, 0)).toBe(0);
    });

    it('should return valid number for numeric values', () => {
      expect(validateNumber(42, 0)).toBe(42);
      expect(validateNumber(0, 10)).toBe(0);
      expect(validateNumber(-5, 0)).toBe(-5);
      expect(validateNumber(3.14, 0)).toBe(3.14);
    });

    it('should return valid number for numeric strings', () => {
      expect(validateNumber('42', 0)).toBe(42);
      expect(validateNumber('3.14', 0)).toBe(3.14);
      expect(validateNumber('-5', 0)).toBe(-5);
    });

    it('should handle objects and arrays', () => {
      expect(validateNumber({}, 10)).toBe(10); // {} converts to NaN
      expect(validateNumber([], 10)).toBe(0); // [] converts to 0
      expect(validateNumber([1, 2], 10)).toBe(10); // [1,2] converts to NaN
    });
  });

  describe('validateArray', () => {
    it('should return empty array for non-arrays', () => {
      expect(validateArray(null)).toEqual([]);
      expect(validateArray(undefined)).toEqual([]);
      expect(validateArray('string')).toEqual([]);
      expect(validateArray(42)).toEqual([]);
      expect(validateArray({})).toEqual([]);
      expect(validateArray(true)).toEqual([]);
    });

    it('should return the array for valid arrays', () => {
      expect(validateArray([])).toEqual([]);
      expect(validateArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(validateArray(['a', 'b'])).toEqual(['a', 'b']);
      expect(validateArray([{ id: 1 }])).toEqual([{ id: 1 }]);
    });

    it('should preserve array type', () => {
      const numbers = validateArray<number>([1, 2, 3]);
      expect(numbers).toEqual([1, 2, 3]);

      const strings = validateArray<string>(['a', 'b']);
      expect(strings).toEqual(['a', 'b']);
    });
  });

  describe('validateString', () => {
    it('should return fallback for null', () => {
      expect(validateString(null, 'default')).toBe('default');
    });

    it('should return fallback for undefined', () => {
      expect(validateString(undefined, 'default')).toBe('default');
    });

    it('should return fallback for empty string', () => {
      expect(validateString('', 'default')).toBe('default');
    });

    it('should return fallback for whitespace-only string', () => {
      expect(validateString('   ', 'default')).toBe('default');
      expect(validateString('\t\n', 'default')).toBe('default');
    });

    it('should return trimmed string for valid strings', () => {
      expect(validateString('hello', 'default')).toBe('hello');
      expect(validateString('  hello  ', 'default')).toBe('hello');
      expect(validateString('\thello\n', 'default')).toBe('hello');
    });

    it('should convert non-strings to strings', () => {
      expect(validateString(42, 'default')).toBe('42');
      expect(validateString(true, 'default')).toBe('true');
    });

    it('should handle objects', () => {
      expect(validateString({}, 'default')).toBe('[object Object]');
    });
  });

  describe('validateImageUrl', () => {
    const defaultPlaceholder = '/api/placeholder/300/300';

    it('should return fallback for null', () => {
      expect(validateImageUrl(null)).toBe(defaultPlaceholder);
      expect(validateImageUrl(null, '/custom.jpg')).toBe('/custom.jpg');
    });

    it('should return fallback for undefined', () => {
      expect(validateImageUrl(undefined)).toBe(defaultPlaceholder);
      expect(validateImageUrl(undefined, '/custom.jpg')).toBe('/custom.jpg');
    });

    it('should return fallback for empty string', () => {
      expect(validateImageUrl('')).toBe(defaultPlaceholder);
      expect(validateImageUrl('   ')).toBe(defaultPlaceholder);
    });

    it('should return fallback for invalid URLs', () => {
      expect(validateImageUrl('not-a-url')).toBe(defaultPlaceholder);
      expect(validateImageUrl('invalid')).toBe(defaultPlaceholder);
    });

    it('should return valid URL for http URLs', () => {
      expect(validateImageUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
      expect(validateImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    });

    it('should return valid URL for relative paths', () => {
      expect(validateImageUrl('/images/photo.jpg')).toBe('/images/photo.jpg');
      expect(validateImageUrl('/api/placeholder/400/400')).toBe('/api/placeholder/400/400');
    });

    it('should trim whitespace from URLs', () => {
      expect(validateImageUrl('  /images/photo.jpg  ')).toBe('/images/photo.jpg');
      expect(validateImageUrl('\thttps://example.com/image.jpg\n')).toBe('https://example.com/image.jpg');
    });

    it('should use custom fallback when provided', () => {
      const customFallback = '/custom-placeholder.png';
      expect(validateImageUrl(null, customFallback)).toBe(customFallback);
      expect(validateImageUrl('', customFallback)).toBe(customFallback);
      expect(validateImageUrl('invalid', customFallback)).toBe(customFallback);
    });
  });
});
