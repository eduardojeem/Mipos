/**
 * Unit tests for time calculation utilities
 * Tests date/time functions with specific scenarios
 */

import {
  getTimeRemaining,
  formatDate,
  isExpired,
  parseDate,
} from '../timeCalculations';

describe('timeCalculations', () => {
  describe('getTimeRemaining', () => {
    it('should return null for undefined', () => {
      expect(getTimeRemaining(undefined)).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(getTimeRemaining('invalid-date')).toBeNull();
      expect(getTimeRemaining('not a date')).toBeNull();
    });

    it('should return "Finalizada" for past dates', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      expect(getTimeRemaining(pastDate)).toBe('Finalizada');
    });

    it('should return days remaining for future dates > 1 day', () => {
      const futureDate = new Date(Date.now() + 2 * 86400000).toISOString(); // 2 days from now
      const result = getTimeRemaining(futureDate);
      
      expect(result).toContain('día');
      expect(result).toContain('restante');
    });

    it('should return hours remaining for future dates < 1 day', () => {
      const futureDate = new Date(Date.now() + 2 * 3600000).toISOString(); // 2 hours from now
      const result = getTimeRemaining(futureDate);
      
      expect(result).toContain('hora');
      expect(result).toContain('restante');
    });

    it('should return minutes remaining for future dates < 1 hour', () => {
      const futureDate = new Date(Date.now() + 30 * 60000).toISOString(); // 30 minutes from now
      const result = getTimeRemaining(futureDate);
      
      expect(result).toContain('minuto');
      expect(result).toContain('restante');
    });

    it('should use singular form for 1 day', () => {
      const futureDate = new Date(Date.now() + 86400000 + 3600000).toISOString(); // ~1 day from now
      const result = getTimeRemaining(futureDate);
      
      expect(result).toMatch(/1 día restante/);
    });

    it('should use plural form for multiple days', () => {
      const futureDate = new Date(Date.now() + 3 * 86400000).toISOString(); // 3 days from now
      const result = getTimeRemaining(futureDate);
      
      expect(result).toMatch(/\d+ días restantes/);
    });
  });

  describe('formatDate', () => {
    it('should format valid date', () => {
      const date = '2024-12-25T12:00:00Z'; // Use noon to avoid timezone issues
      const result = formatDate(date);
      
      expect(result).toContain('2024');
      expect(result).toContain('diciembre');
      expect(result).toMatch(/2[45]/); // Could be 24 or 25 depending on timezone
    });

    it('should return original string for invalid date', () => {
      const invalidDate = 'invalid-date';
      expect(formatDate(invalidDate)).toBe(invalidDate);
    });

    it('should use custom locale', () => {
      const date = '2024-12-25T00:00:00Z';
      const result = formatDate(date, 'en-US');
      
      expect(result).toContain('2024');
      expect(result).toContain('December');
    });

    it('should handle edge case dates', () => {
      const leapDay = '2024-02-29T12:00:00Z'; // Use noon to avoid timezone issues
      const result = formatDate(leapDay);
      
      expect(result).toContain('2024');
      expect(result).toContain('febrero');
      expect(result).toMatch(/2[89]/); // Could be 28 or 29 depending on timezone
    });
  });

  describe('isExpired', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      expect(isExpired(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(isExpired(futureDate)).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isExpired('invalid-date')).toBe(false);
      expect(isExpired('not a date')).toBe(false);
    });

    it('should handle dates very close to now', () => {
      const almostNow = new Date(Date.now() - 100).toISOString(); // 100ms ago
      expect(isExpired(almostNow)).toBe(true);
      
      const justFuture = new Date(Date.now() + 100).toISOString(); // 100ms from now
      expect(isExpired(justFuture)).toBe(false);
    });
  });

  describe('parseDate', () => {
    it('should parse valid ISO date', () => {
      const dateStr = '2024-12-25T12:00:00Z'; // Use noon to avoid timezone issues
      const result = parseDate(dateStr);
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(11); // December is month 11
      // Date could be 24 or 25 depending on timezone
      expect([24, 25]).toContain(result?.getDate());
    });

    it('should parse various date formats', () => {
      const formats = [
        '2024-12-25',
        '2024/12/25',
        'December 25, 2024',
        '25 Dec 2024',
      ];
      
      formats.forEach(format => {
        const result = parseDate(format);
        expect(result).toBeInstanceOf(Date);
        expect(result).not.toBeNull();
      });
    });

    it('should return null for invalid dates', () => {
      expect(parseDate('invalid-date')).toBeNull();
      expect(parseDate('not a date')).toBeNull();
      expect(parseDate('2024-13-45')).toBeNull(); // Invalid month/day
    });

    it('should handle edge cases', () => {
      const leapDay = parseDate('2024-02-29');
      expect(leapDay).toBeInstanceOf(Date);
      
      const nonLeapDay = parseDate('2023-02-29');
      expect(nonLeapDay).toBeInstanceOf(Date); // JS Date auto-corrects to March 1
    });

    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });
  });
});
