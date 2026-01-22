import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  isValidImageUrl, 
  sanitizeImageUrl, 
  sanitizeImageUrls,
  addAllowedDomain,
  getAllowedDomains
} from '../image-url';

describe('Image URL Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidImageUrl', () => {
    it('should accept valid HTTPS URLs from allowed domains', () => {
      expect(isValidImageUrl('https://supabase.co/image.jpg')).toBe(true);
      expect(isValidImageUrl('https://cdn.supabase.co/image.jpg')).toBe(true);
      expect(isValidImageUrl('https://beautypos.com/logo.png')).toBe(true);
    });

    it('should accept valid HTTP URLs from localhost', () => {
      expect(isValidImageUrl('http://localhost:3000/image.jpg')).toBe(true);
      expect(isValidImageUrl('http://127.0.0.1:3000/image.jpg')).toBe(true);
    });

    it('should accept data URLs', () => {
      expect(isValidImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
      expect(isValidImageUrl('data:image/jpeg;base64,/9j/4AAQ=')).toBe(true);
    });

    it('should reject URLs with invalid protocols', () => {
      expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
      expect(isValidImageUrl('ftp://example.com/image.jpg')).toBe(false);
      expect(isValidImageUrl('file:///etc/passwd')).toBe(false);
    });

    it('should reject URLs from non-whitelisted domains', () => {
      expect(isValidImageUrl('https://evil.com/malicious.jpg')).toBe(false);
      expect(isValidImageUrl('https://attacker.net/xss.png')).toBe(false);
    });

    it('should reject null, undefined, and empty strings', () => {
      expect(isValidImageUrl(null)).toBe(false);
      expect(isValidImageUrl(undefined)).toBe(false);
      expect(isValidImageUrl('')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidImageUrl('not a url')).toBe(false);
      expect(isValidImageUrl('htp://broken.com')).toBe(false);
      expect(isValidImageUrl('//no-protocol.com/image.jpg')).toBe(false);
    });
  });

  describe('sanitizeImageUrl', () => {
    it('should return valid URLs unchanged', () => {
      const validUrl = 'https://supabase.co/image.jpg';
      expect(sanitizeImageUrl(validUrl)).toBe(validUrl);
    });

    it('should return fallback for invalid URLs', () => {
      expect(sanitizeImageUrl('https://evil.com/bad.jpg')).toBe('/placeholder.png');
      expect(sanitizeImageUrl('javascript:alert(1)')).toBe('/placeholder.png');
    });

    it('should use custom fallback when provided', () => {
      const customFallback = '/custom-placeholder.png';
      expect(sanitizeImageUrl('invalid', customFallback)).toBe(customFallback);
    });

    it('should return fallback for null/undefined', () => {
      expect(sanitizeImageUrl(null)).toBe('/placeholder.png');
      expect(sanitizeImageUrl(undefined)).toBe('/placeholder.png');
    });
  });

  describe('sanitizeImageUrls', () => {
    it('should sanitize array of URLs', () => {
      const urls = [
        'https://supabase.co/1.jpg',
        'https://evil.com/bad.jpg',
        'https://beautypos.com/2.jpg',
        null,
        'invalid'
      ];

      const result = sanitizeImageUrls(urls);

      expect(result).toEqual([
        'https://supabase.co/1.jpg',
        '/placeholder.png',
        'https://beautypos.com/2.jpg',
        '/placeholder.png',
        '/placeholder.png'
      ]);
    });

    it('should use custom fallback for all invalid URLs', () => {
      const urls = ['invalid1', 'invalid2'];
      const result = sanitizeImageUrls(urls, '/custom.png');

      expect(result).toEqual(['/custom.png', '/custom.png']);
    });
  });

  describe('addAllowedDomain', () => {
    it('should add new domain to whitelist', () => {
      const newDomain = 'newdomain.com';
      addAllowedDomain(newDomain);
      
      expect(isValidImageUrl(`https://${newDomain}/image.jpg`)).toBe(true);
    });

    it('should not add duplicate domains', () => {
      const initialLength = getAllowedDomains().length;
      addAllowedDomain('supabase.co');
      
      expect(getAllowedDomains().length).toBe(initialLength);
    });
  });

  describe('getAllowedDomains', () => {
    it('should return array of allowed domains', () => {
      const domains = getAllowedDomains();
      
      expect(Array.isArray(domains)).toBe(true);
      expect(domains.length).toBeGreaterThan(0);
      expect(domains).toContain('supabase.co');
    });

    it('should return a copy of the array', () => {
      const domains1 = getAllowedDomains();
      const domains2 = getAllowedDomains();
      
      expect(domains1).not.toBe(domains2);
      expect(domains1).toEqual(domains2);
    });
  });
});
