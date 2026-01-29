/**
 * Unit tests for SuperAdmin Stats API - Environment Variable Validation
 * 
 * Tests environment variable validation according to requirement 8.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import * as supabaseServer from '@/lib/supabase/server';
import * as env from '@/lib/env';
import { structuredLogger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/env');
vi.mock('@/lib/logger');

// Type helper for mocked Supabase client
type MockedSupabaseClient = Awaited<ReturnType<typeof supabaseServer.createClient>>;

describe('SuperAdmin Stats API - Environment Variable Validation', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Create a mock request
    mockRequest = {
      url: 'http://localhost:3000/api/superadmin/stats',
      method: 'GET',
    } as NextRequest;
    
    // Mock logger methods
    vi.mocked(structuredLogger.info).mockImplementation(() => {});
    vi.mocked(structuredLogger.error).mockImplementation(() => {});
    vi.mocked(structuredLogger.success).mockImplementation(() => {});
    vi.mocked(structuredLogger.warn).mockImplementation(() => {});
  });

  describe('Environment Variable Validation', () => {
    it('should return 500 error when Supabase config is missing', async () => {
      // Mock missing Supabase config
      vi.mocked(env.getSupabaseConfig).mockReturnValue(null);
      vi.mocked(env.getSupabaseAdminConfig).mockReturnValue({
        url: 'https://test.supabase.co',
        serviceRoleKey: 'test-service-role-key',
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(500);
      expect(data.error).toBe('Configuration error');
      expect(data.message).toContain('Supabase is not properly configured');

      // Verify logging
      expect(structuredLogger.error).toHaveBeenCalledWith(
        'Missing required Supabase environment variables',
        expect.any(Error),
        expect.objectContaining({
          component: 'SuperAdminStatsAPI',
          action: 'validateEnvironment',
          metadata: expect.objectContaining({
            message: 'Required Supabase URL or ANON_KEY environment variables are missing or invalid',
          }),
        })
      );
    });

    it('should return 500 error when admin config (service role key) is missing', async () => {
      // Mock missing admin config
      vi.mocked(env.getSupabaseConfig).mockReturnValue({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
      });
      vi.mocked(env.getSupabaseAdminConfig).mockReturnValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(500);
      expect(data.error).toBe('Configuration error');
      expect(data.message).toContain('Supabase admin client is not properly configured');
      expect(data.message).toContain('SUPABASE_SERVICE_ROLE_KEY');

      // Verify logging
      expect(structuredLogger.error).toHaveBeenCalledWith(
        'Missing Supabase Service Role Key',
        expect.any(Error),
        expect.objectContaining({
          component: 'SuperAdminStatsAPI',
          action: 'validateEnvironment',
          metadata: expect.objectContaining({
            missingVariables: ['SUPABASE_SERVICE_ROLE_KEY'],
            message: 'Service Role Key is required for admin operations',
          }),
        })
      );
    });

    it('should proceed with request when all environment variables are present', async () => {
      // Mock valid configs
      vi.mocked(env.getSupabaseConfig).mockReturnValue({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
      });
      vi.mocked(env.getSupabaseAdminConfig).mockReturnValue({
        url: 'https://test.supabase.co',
        serviceRoleKey: 'test-service-role-key',
      });

      // Mock Supabase client responses
      const mockAuthGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const mockSupabaseClient = {
        auth: {
          getUser: mockAuthGetUser,
        },
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient as unknown as MockedSupabaseClient);

      await GET(mockRequest);

      // Verify environment validation passed
      expect(structuredLogger.success).toHaveBeenCalledWith(
        'Environment variables validated successfully',
        expect.objectContaining({
          component: 'SuperAdminStatsAPI',
          action: 'validateEnvironment',
          metadata: expect.objectContaining({
            hasSupabaseUrl: true,
            hasAnonKey: true,
            hasServiceRoleKey: true,
          }),
        })
      );

      // Verify the request proceeded (even if it fails auth later)
      expect(mockAuthGetUser).toHaveBeenCalled();
    });

    it('should log validation info with correct metadata', async () => {
      // Mock valid configs
      vi.mocked(env.getSupabaseConfig).mockReturnValue({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
      });
      vi.mocked(env.getSupabaseAdminConfig).mockReturnValue({
        url: 'https://test.supabase.co',
        serviceRoleKey: 'test-service-role-key',
      });

      // Mock Supabase client
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient as unknown as MockedSupabaseClient);

      await GET(mockRequest);

      // Verify validation logging
      expect(structuredLogger.info).toHaveBeenCalledWith(
        'Validating Supabase environment variables',
        expect.objectContaining({
          component: 'SuperAdminStatsAPI',
          action: 'validateEnvironment',
          metadata: expect.objectContaining({
            hasSupabaseConfig: true,
            hasAdminConfig: true,
          }),
        })
      );
    });

    it('should identify specific missing variables in error metadata', async () => {
      // Mock missing config with specific environment variables
      vi.mocked(env.getSupabaseConfig).mockReturnValue(null);
      vi.mocked(env.getSupabaseAdminConfig).mockReturnValue(null);

      // Mock process.env to simulate missing variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        SUPABASE_ANON_KEY: undefined,
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify error response
      expect(response.status).toBe(500);
      expect(data.error).toBe('Configuration error');

      // Verify logging includes missing variables
      expect(structuredLogger.error).toHaveBeenCalledWith(
        'Missing required Supabase environment variables',
        expect.any(Error),
        expect.objectContaining({
          component: 'SuperAdminStatsAPI',
          action: 'validateEnvironment',
          metadata: expect.objectContaining({
            missingVariables: expect.arrayContaining(['SUPABASE_URL', 'SUPABASE_ANON_KEY']),
          }),
        })
      );

      // Restore original env
      process.env = originalEnv;
    });
  });

  describe('Integration with existing authentication flow', () => {
    it('should validate environment before checking authentication', async () => {
      // Mock missing config
      vi.mocked(env.getSupabaseConfig).mockReturnValue(null);
      vi.mocked(env.getSupabaseAdminConfig).mockReturnValue(null);

      const mockCreateClient = vi.fn();
      vi.mocked(supabaseServer.createClient).mockImplementation(mockCreateClient as unknown as typeof supabaseServer.createClient);

      await GET(mockRequest);

      // Verify createClient was never called because env validation failed first
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('should proceed to authentication after successful environment validation', async () => {
      // Mock valid configs
      vi.mocked(env.getSupabaseConfig).mockReturnValue({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
      });
      vi.mocked(env.getSupabaseAdminConfig).mockReturnValue({
        url: 'https://test.supabase.co',
        serviceRoleKey: 'test-service-role-key',
      });

      const mockAuthGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      });

      const mockSupabaseClient = {
        auth: {
          getUser: mockAuthGetUser,
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient as unknown as MockedSupabaseClient);
      vi.mocked(supabaseServer.createAdminClient).mockResolvedValue(mockSupabaseClient as unknown as MockedSupabaseClient);

      await GET(mockRequest);

      // Verify authentication was attempted after env validation
      expect(mockAuthGetUser).toHaveBeenCalled();
      expect(structuredLogger.info).toHaveBeenCalledWith(
        'Authentication check completed',
        expect.any(Object)
      );
    });
  });
});
