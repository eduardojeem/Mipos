import { renderHook, act } from '@testing-library/react';
import { useSecureProducts } from '../useSecureProducts';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock dependencies
const mockSupabase = {
  from: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
  executeQuery: vi.fn(),
};

const mockUser = { id: 'test-user-id' };

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/lib/supabase-secure', () => ({
  SecureSupabaseClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('useSecureProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty error object gracefully', async () => {
    // Mock executeQuery to return an empty error object
    mockSupabase.executeQuery.mockResolvedValue({
      data: null,
      error: {}, // Empty error object
      count: 0,
    });

    const { result } = renderHook(() => useSecureProducts());

    await act(async () => {
      await result.current.fetchProducts();
    });

    // Expect error state to be set with a meaningful message
    expect(result.current.error).toBe('Empty error object received in fetchProducts');
  });

  it('should handle standard Error object', async () => {
    const error = new Error('Test error');
    mockSupabase.executeQuery.mockResolvedValue({
      data: null,
      error: error,
      count: 0,
    });

    const { result } = renderHook(() => useSecureProducts());

    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(result.current.error).toBe('Test error');
  });

  it('should handle string error', async () => {
    const error = 'String error';
    mockSupabase.executeQuery.mockResolvedValue({
      data: null,
      error: error,
      count: 0,
    });

    const { result } = renderHook(() => useSecureProducts());

    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(result.current.error).toBe('String error');
  });
});