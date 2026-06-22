import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateSignupInput, generateOrgSlug } from './signup-service';

/**
 * Test suite for organization signup flow
 * Run with: npm test -- register.test.ts
 */

describe('Signup Service', () => {
  describe('validateSignupInput', () => {
    it('should accept valid input', () => {
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'RETAIL',
        planSlug: 'free',
        billingCycle: 'monthly',
      };

      const errors = validateSignupInput(input);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing email', () => {
      const input = {
        email: '',
        password: 'SecurePass123!',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const emailError = errors.find((e) => e.field === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.code).toBe('MISSING_EMAIL');
    });

    it('should reject invalid email format', () => {
      const input = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const emailError = errors.find((e) => e.field === 'email');
      expect(emailError?.code).toBe('INVALID_EMAIL_FORMAT');
    });

    it('should reject email > 255 chars', () => {
      const input = {
        email: 'a'.repeat(250) + '@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const emailError = errors.find((e) => e.field === 'email');
      expect(emailError?.code).toBe('EMAIL_TOO_LONG');
    });

    it('should reject password < 8 chars', () => {
      const input = {
        email: 'user@example.com',
        password: 'Short1!',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const passwordError = errors.find((e) => e.field === 'password');
      expect(passwordError?.code).toBe('PASSWORD_TOO_SHORT');
    });

    it('should reject password without letters', () => {
      const input = {
        email: 'user@example.com',
        password: '12345678!',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const passwordError = errors.find((e) => e.field === 'password');
      expect(passwordError?.code).toBe('PASSWORD_MISSING_LETTERS');
    });

    it('should reject password without numbers or symbols', () => {
      const input = {
        email: 'user@example.com',
        password: 'onlyletters',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const passwordError = errors.find((e) => e.field === 'password');
      expect(passwordError?.code).toBe('PASSWORD_MISSING_NUMBERS_OR_SYMBOLS');
    });

    it('should reject missing name', () => {
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: '',
        organizationName: 'My Company',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const nameError = errors.find((e) => e.field === 'name');
      expect(nameError?.code).toBe('MISSING_NAME');
    });

    it('should reject name > 100 chars', () => {
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: 'a'.repeat(101),
        organizationName: 'My Company',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const nameError = errors.find((e) => e.field === 'name');
      expect(nameError?.code).toBe('NAME_TOO_LONG');
    });

    it('should reject missing organization name', () => {
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        organizationName: '',
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const orgError = errors.find((e) => e.field === 'organizationName');
      expect(orgError?.code).toBe('MISSING_ORG_NAME');
    });

    it('should reject organization name > 200 chars', () => {
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        organizationName: 'a'.repeat(201),
        vertical: 'RETAIL',
      };

      const errors = validateSignupInput(input);
      const orgError = errors.find((e) => e.field === 'organizationName');
      expect(orgError?.code).toBe('ORG_NAME_TOO_LONG');
    });

    it('should reject invalid vertical', () => {
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'INVALID',
      };

      const errors = validateSignupInput(input);
      const verticalError = errors.find((e) => e.field === 'vertical');
      expect(verticalError?.code).toBe('INVALID_VERTICAL');
    });

    it('should reject invalid plan', () => {
      const input = {
        email: 'user@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        organizationName: 'My Company',
        vertical: 'RETAIL',
        planSlug: 'invalid-plan',
      };

      const errors = validateSignupInput(input);
      const planError = errors.find((e) => e.field === 'planSlug');
      expect(planError?.code).toBe('INVALID_PLAN');
    });

    it('should validate multiple errors at once', () => {
      const input = {
        email: 'invalid',
        password: 'short',
        name: '',
        organizationName: '',
        vertical: 'INVALID',
      };

      const errors = validateSignupInput(input);
      expect(errors.length).toBeGreaterThan(3);
      expect(errors.some((e) => e.field === 'email')).toBe(true);
      expect(errors.some((e) => e.field === 'password')).toBe(true);
      expect(errors.some((e) => e.field === 'name')).toBe(true);
      expect(errors.some((e) => e.field === 'organizationName')).toBe(true);
      expect(errors.some((e) => e.field === 'vertical')).toBe(true);
    });
  });

  describe('generateOrgSlug', () => {
    it('should generate slug from organization name', () => {
      const slug = generateOrgSlug('My Company');
      expect(slug).toMatch(/^my-company-[a-f0-9]{8}$/);
    });

    it('should handle special characters', () => {
      const slug = generateOrgSlug('Mi Empresa & Co.');
      expect(slug).toMatch(/^mi-empresa-co-[a-f0-9]{8}$/);
    });

    it('should handle accented characters', () => {
      const slug = generateOrgSlug('Café Español');
      expect(slug).toMatch(/^cafe-espanol-[a-f0-9]{8}$/);
    });

    it('should handle only symbols (fallback)', () => {
      const slug = generateOrgSlug('!@#$%');
      expect(slug).toMatch(/^org-[a-f0-9]{8}$/);
    });

    it('should handle empty string (fallback)', () => {
      const slug = generateOrgSlug('');
      expect(slug).toMatch(/^org-[a-f0-9]{8}$/);
    });

    it('should generate unique slugs for same name', () => {
      const slug1 = generateOrgSlug('Company');
      const slug2 = generateOrgSlug('Company');
      expect(slug1).not.toBe(slug2);
    });

    it('should lowercase result', () => {
      const slug = generateOrgSlug('MY COMPANY');
      expect(slug).toMatch(/^my-company-[a-f0-9]{8}$/);
    });
  });
});

/**
 * Integration tests for signup endpoint
 * These require a test database and Supabase setup
 */
describe.skip('POST /api/auth/register - Integration', () => {
  // Setup test environment
  beforeEach(() => {
    // Clean up test data
    vi.clearAllMocks();
  });

  it('should successfully register new organization', async () => {
    // Implementation: make request to POST /api/auth/register
    // Verify: user created in auth, organization created, member added, etc
  });

  it('should prevent duplicate email registration', async () => {
    // Implementation: register with email, then try again with same email
    // Verify: returns 409 EMAIL_ALREADY_REGISTERED
  });

  it('should enforce rate limiting', async () => {
    // Implementation: make 6 requests in rapid succession
    // Verify: 6th request returns 429 RATE_LIMIT_EXCEEDED
  });

  it('should cleanup on partial failure', async () => {
    // Implementation: mock subscription sync to fail
    // Verify: organization and auth user are cleaned up
  });

  it('should send welcome email', async () => {
    // Implementation: register new user
    // Verify: welcome email sent to registered email
  });

  it('should handle linked user (existing email)', async () => {
    // Implementation: create user, then register with same email but new org
    // Verify: organization created and linked to existing user
  });
});
