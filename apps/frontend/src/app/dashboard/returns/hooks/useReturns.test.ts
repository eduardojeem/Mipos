import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReturns } from './useReturns';

const { toastMock, apiGetMock, apiPostMock, apiPatchMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPatchMock: vi.fn(),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: apiGetMock,
    post: apiPostMock,
    patch: apiPatchMock,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useReturns', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiGetMock.mockImplementation((url: string) => {
      if (url === '/returns') {
        return Promise.resolve({
          data: {
            returns: [],
            pagination: { page: 1, limit: 25, total: 0, totalPages: 1 },
          },
        });
      }

      if (url === '/returns/stats') {
        return Promise.resolve({
          data: {
            totalReturns: 0,
            totalAmount: 0,
            pendingReturns: 0,
            pendingAmount: 0,
            approvedReturns: 0,
            approvedAmount: 0,
            rejectedReturns: 0,
            rejectedAmount: 0,
            completedReturns: 0,
            completedAmount: 0,
            avgProcessingTime: 0,
            returnRate: 0,
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    apiPostMock.mockResolvedValue({ data: { ok: true } });
    apiPatchMock.mockResolvedValue({ data: { ok: true } });
  });

  it('updates returns through /returns/{id}/status', async () => {
    const { result } = renderHook(() => useReturns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateReturn('return-1', 'approved');
    });

    expect(apiPatchMock).toHaveBeenCalledWith('/returns/return-1/status', {
      status: 'APPROVED',
      notes: undefined,
    });
  });

  it('exposes awaitable create and process mutations', async () => {
    const { result } = renderHook(() => useReturns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createReturn({
        originalSaleId: '9c50f0ef-5ef2-42c2-bf8c-f89a04d6c001',
        customerId: '9c50f0ef-5ef2-42c2-bf8c-f89a04d6c002',
        reason: 'defective',
        refundMethod: 'cash',
        items: [
          {
            originalSaleItemId: '9c50f0ef-5ef2-42c2-bf8c-f89a04d6c003',
            productId: '9c50f0ef-5ef2-42c2-bf8c-f89a04d6c004',
            quantity: 1,
            unitPrice: 150,
          },
        ],
      });

      await result.current.processReturn('return-1');
    });

    expect(apiPostMock).toHaveBeenNthCalledWith(1, '/returns', {
      originalSaleId: '9c50f0ef-5ef2-42c2-bf8c-f89a04d6c001',
      customerId: '9c50f0ef-5ef2-42c2-bf8c-f89a04d6c002',
      reason: 'defective',
      refundMethod: 'cash',
      items: [
        {
          originalSaleItemId: '9c50f0ef-5ef2-42c2-bf8c-f89a04d6c003',
          productId: '9c50f0ef-5ef2-42c2-bf8c-f89a04d6c004',
          quantity: 1,
          unitPrice: 150,
        },
      ],
    });
    expect(apiPostMock).toHaveBeenNthCalledWith(2, '/returns/return-1/process');
  });
});
