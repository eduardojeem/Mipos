import React from 'react'
import { vi } from 'vitest'
import { render } from '@testing-library/react'
import { UnifiedPermissionsProvider } from '@/hooks/use-unified-permissions'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Utilidad mínima para simular fetch según rutas
export type FetchRouteHandler = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>

export const createOkResponse = (data: any, status = 200) => ({
  ok: true,
  status,
  json: async () => data,
})

export const createErrorResponse = (status = 500, data: any = { error: 'error' }) => ({
  ok: false,
  status,
  json: async () => data,
})

export const mockGlobalFetch = (handler: FetchRouteHandler) => {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    return handler(url, init)
  })
  // @ts-expect-error override for tests
  global.fetch = fn
  return fn
}

// Render con proveedor de permisos (depende del mock de auth)
export const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <UnifiedPermissionsProvider>{ui}</UnifiedPermissionsProvider>
    </QueryClientProvider>
  )
}