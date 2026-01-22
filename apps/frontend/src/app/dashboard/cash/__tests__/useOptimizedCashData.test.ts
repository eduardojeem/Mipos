import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOptimizedCashData } from '../hooks/useOptimizedCashData';
import api from '@/lib/api';

// Mock API
jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useOptimizedCashData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch cash session data successfully', async () => {
    const mockSessionData = {
      id: '1',
      startAmount: 1000,
      currentAmount: 1500,
      isActive: true,
      startedAt: '2024-01-01T10:00:00Z',
      movements: [],
    };

    mockApi.get.mockResolvedValueOnce({
      data: { success: true, data: mockSessionData }
    });

    const { result } = renderHook(() => useOptimizedCashData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSessionData);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API Error');
    mockApi.get.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useOptimizedCashData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should calculate metrics correctly', async () => {
    const mockSessionData = {
      id: '1',
      startAmount: 1000,
      currentAmount: 1500,
      isActive: true,
      startedAt: '2024-01-01T10:00:00Z',
      movements: [
        { type: 'SALE', amount: 100, createdAt: '2024-01-01T11:00:00Z' },
        { type: 'SALE', amount: 200, createdAt: '2024-01-01T12:00:00Z' },
        { type: 'EXPENSE', amount: -50, createdAt: '2024-01-01T13:00:00Z' },
      ],
    };

    mockApi.get.mockResolvedValueOnce({
      data: { success: true, data: mockSessionData }
    });

    const { result } = renderHook(() => useOptimizedCashData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.metrics).toEqual({
        totalSales: 300,
        totalExpenses: 50,
        netIncome: 250,
        transactionCount: 3,
        averageTransaction: 100,
      });
    });
  });

  it('should handle empty session data', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { success: true, data: null }
    });

    const { result } = renderHook(() => useOptimizedCashData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.session).toBeNull();
      expect(result.current.metrics).toEqual({
        totalSales: 0,
        totalExpenses: 0,
        netIncome: 0,
        transactionCount: 0,
        averageTransaction: 0,
      });
    });
  });

  it('should refetch data when called', async () => {
    const mockSessionData = {
      id: '1',
      startAmount: 1000,
      currentAmount: 1500,
      isActive: true,
      startedAt: '2024-01-01T10:00:00Z',
      movements: [],
    };

    mockApi.get.mockResolvedValue({
      data: { success: true, data: mockSessionData }
    });

    const { result } = renderHook(() => useOptimizedCashData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.session).toEqual(mockSessionData);
    });

    // Call refetch
    await result.current.refetch();

    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
});