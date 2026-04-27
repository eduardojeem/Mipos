import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import type { CustomerSortField, UICustomer } from '@/types/customer-page';

const NO_ORGANIZATION_KEY = 'no-organization';

export interface CustomerSummary {
  total: number;
  active: number;
  inactive: number;
  vip: number;
  wholesale: number;
  regular: number;
  newThisMonth: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  highValue: number;
  frequent: number;
  growthRate: number;
  activeRate: number;
  generatedAt: string;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  type?: 'all' | 'regular' | 'vip' | 'wholesale';
  hasRUC?: 'all' | 'yes' | 'no';
  sortBy?: CustomerSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CustomerListResponse {
  customers: UICustomer[];
  pagination: CustomerListPagination;
  filters?: {
    search: string;
    status: string;
    type: string;
    sortBy: string;
    sortOrder: string;
  };
}

export interface CustomerAnalytics {
  overview: Record<string, unknown>;
  segmentation?: Record<string, { count: number; percentage: number }>;
  trends?: Array<Record<string, unknown>>;
  riskAnalysis: Record<string, unknown>;
  valueAnalysis: Record<string, unknown>;
  generatedAt: string;
}

export interface CustomerSearchParams {
  q: string;
  limit?: number;
  suggestions?: boolean;
  stats?: boolean;
}

export interface CustomerSearchResponse {
  results: UICustomer[];
  suggestions: string[];
  stats: Record<string, unknown>;
  query?: string;
}

export interface CustomerCreateInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  ruc?: string | null;
  customerType?: UICustomer['customerType'];
  birthDate?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface CustomerUpdateInput {
  id: string;
  data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    tax_id?: string | null;
    ruc?: string | null;
    customerType?: UICustomer['customerType'];
    birthDate?: string | null;
    notes?: string | null;
    is_active?: boolean;
  };
}

export interface CustomerBulkOperationResponse {
  success: boolean;
  message?: string;
  error?: string;
  data: {
    action: string;
    processedCount: number;
    requestedCount: number;
    csvContent?: string;
    filename?: string;
    contentType?: string;
    deleted?: number;
    deactivated?: number;
    errors?: string[];
  };
}

type CustomerApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  details?: string;
};

export const customerKeys = {
  root: ['customers'] as const,
  all: (organizationId?: string | null) =>
    [...customerKeys.root, organizationId || NO_ORGANIZATION_KEY] as const,
  summary: (organizationId?: string | null) =>
    [...customerKeys.all(organizationId), 'summary'] as const,
  lists: (organizationId?: string | null) =>
    [...customerKeys.all(organizationId), 'list'] as const,
  list: (organizationId: string | null | undefined, params: CustomerListParams) =>
    [...customerKeys.lists(organizationId), params] as const,
  analytics: (
    organizationId?: string | null,
    params: { period?: string; segmentation?: boolean; trends?: boolean } = {}
  ) => [...customerKeys.all(organizationId), 'analytics', params] as const,
  search: (organizationId: string | null | undefined, params: CustomerSearchParams) =>
    [...customerKeys.all(organizationId), 'search', params] as const,
  detail: (organizationId: string | null | undefined, id: string) =>
    [...customerKeys.all(organizationId), 'detail', id] as const,
};

function buildHeaders(
  organizationId: string,
  init?: RequestInit,
  includeJsonContentType: boolean = false
): Headers {
  const headers = new Headers(init?.headers);
  headers.set('x-organization-id', organizationId);

  if (includeJsonContentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let payload: CustomerApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as CustomerApiEnvelope<T>;
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || payload?.details || fallbackMessage);
  }

  return payload.data;
}

async function fetchCustomerData<T>(
  input: string,
  organizationId: string,
  init?: RequestInit,
  fallbackMessage: string = 'No se pudo cargar la informacion de clientes'
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: buildHeaders(organizationId, init, false),
    credentials: 'same-origin',
  });

  return parseJsonResponse<T>(response, fallbackMessage);
}

function normalizeCustomerListParams(params: CustomerListParams): Required<CustomerListParams> {
  return {
    page: params.page || 1,
    limit: params.limit || 10,
    search: params.search || '',
    status: params.status || 'all',
    type: params.type || 'all',
    hasRUC: params.hasRUC || 'all',
    sortBy: params.sortBy || 'created_at',
    sortOrder: params.sortOrder || 'desc',
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function useCustomerSummary() {
  const organizationId = useCurrentOrganizationId();

  return useQuery({
    queryKey: customerKeys.summary(organizationId),
    queryFn: () =>
      fetchCustomerData<CustomerSummary>(
        '/api/customers/summary',
        organizationId!,
        undefined,
        'No se pudo cargar el resumen de clientes'
      ),
    enabled: Boolean(organizationId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCustomerList(params: CustomerListParams = {}) {
  const organizationId = useCurrentOrganizationId();

  const memoizedParams = useMemo(() => normalizeCustomerListParams(params), [params]);

  return useQuery({
    queryKey: customerKeys.list(organizationId, memoizedParams),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: String(memoizedParams.page),
        limit: String(memoizedParams.limit),
        status: memoizedParams.status,
        type: memoizedParams.type,
        hasRUC: memoizedParams.hasRUC,
        sortBy: memoizedParams.sortBy,
        sortOrder: memoizedParams.sortOrder,
      });

      if (memoizedParams.search.trim()) {
        searchParams.set('search', memoizedParams.search.trim());
      }

      return fetchCustomerData<CustomerListResponse>(
        `/api/customers/list?${searchParams.toString()}`,
        organizationId!,
        undefined,
        'No se pudo cargar la lista de clientes'
      );
    },
    enabled: Boolean(organizationId),
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useCustomerAnalytics(
  period: string = '30',
  options: { segmentation?: boolean; trends?: boolean } = {}
) {
  const organizationId = useCurrentOrganizationId();
  const analyticsParams = useMemo(
    () => ({
      period,
      segmentation: Boolean(options.segmentation),
      trends: Boolean(options.trends),
    }),
    [options.segmentation, options.trends, period]
  );

  return useQuery({
    queryKey: customerKeys.analytics(organizationId, analyticsParams),
    queryFn: async (): Promise<CustomerAnalytics> => {
      const searchParams = new URLSearchParams({
        period: analyticsParams.period,
        segmentation: analyticsParams.segmentation ? 'true' : 'false',
        trends: analyticsParams.trends ? 'true' : 'false',
      });

      return fetchCustomerData<CustomerAnalytics>(
        `/api/customers/analytics?${searchParams.toString()}`,
        organizationId!,
        undefined,
        'No se pudo cargar la analitica de clientes'
      );
    },
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCustomerSearch(params: CustomerSearchParams) {
  const organizationId = useCurrentOrganizationId();
  const normalizedQuery = params.q.trim();

  return useQuery({
    queryKey: customerKeys.search(organizationId, params),
    queryFn: async (): Promise<CustomerSearchResponse> => {
      const searchParams = new URLSearchParams({
        q: normalizedQuery,
        limit: String(params.limit || 10),
        suggestions: params.suggestions ? 'true' : 'false',
        stats: params.stats ? 'true' : 'false',
      });

      return fetchCustomerData<CustomerSearchResponse>(
        `/api/customers/search?${searchParams.toString()}`,
        organizationId!,
        undefined,
        'No se pudo buscar clientes'
      );
    },
    enabled: Boolean(organizationId) && normalizedQuery.length > 0,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCustomerDetail(id: string, options: { enabled?: boolean } = {}) {
  const organizationId = useCurrentOrganizationId();

  return useQuery({
    queryKey: customerKeys.detail(organizationId, id),
    queryFn: () =>
      fetchCustomerData<UICustomer>(
        `/api/customers/${id}`,
        organizationId!,
        undefined,
        'No se pudo cargar el cliente'
      ),
    enabled: (options.enabled ?? true) && Boolean(organizationId) && Boolean(id),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateCustomer() {
  const organizationId = useCurrentOrganizationId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customerData: CustomerCreateInput) => {
      if (!organizationId) {
        throw new Error('No hay una organizacion seleccionada');
      }

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: buildHeaders(organizationId, undefined, true),
        body: JSON.stringify(customerData),
      });

      return parseJsonResponse<UICustomer>(response, 'No se pudo crear el cliente');
    },
    onSuccess: async (newCustomer) => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all(organizationId) });

      toast({
        title: 'Cliente creado',
        description: `${newCustomer.name} se creo correctamente.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo crear el cliente'),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCustomer() {
  const organizationId = useCurrentOrganizationId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: CustomerUpdateInput) => {
      if (!organizationId) {
        throw new Error('No hay una organizacion seleccionada');
      }

      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: buildHeaders(organizationId, undefined, true),
        body: JSON.stringify(data),
      });

      return parseJsonResponse<UICustomer>(response, 'No se pudo actualizar el cliente');
    },
    onSuccess: async (updatedCustomer) => {
      queryClient.setQueryData(customerKeys.detail(organizationId, updatedCustomer.id), updatedCustomer);
      await queryClient.invalidateQueries({ queryKey: customerKeys.all(organizationId) });

      toast({
        title: 'Cliente actualizado',
        description: `${updatedCustomer.name} se actualizo correctamente.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo actualizar el cliente'),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCustomer() {
  const organizationId = useCurrentOrganizationId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('No hay una organizacion seleccionada');
      }

      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: buildHeaders(organizationId),
      });

      let payload: { success: boolean; message?: string; error?: string } | null = null;

      try {
        payload = (await response.json()) as { success: boolean; message?: string; error?: string };
      } catch {
        throw new Error('No se pudo eliminar el cliente');
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'No se pudo eliminar el cliente');
      }

      return { id, message: payload.message };
    },
    onSuccess: async (result) => {
      queryClient.removeQueries({ queryKey: customerKeys.detail(organizationId, result.id) });
      await queryClient.invalidateQueries({ queryKey: customerKeys.all(organizationId) });

      toast({
        title: 'Cliente removido',
        description: result.message || 'El cliente se removio correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo eliminar el cliente'),
        variant: 'destructive',
      });
    },
  });
}

export function useBulkCustomerOperation() {
  const organizationId = useCurrentOrganizationId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      action,
      customerIds,
    }: {
      action: 'activate' | 'deactivate' | 'delete' | 'export';
      customerIds: string[];
    }) => {
      if (!organizationId) {
        throw new Error('No hay una organizacion seleccionada');
      }

      const response = await fetch('/api/customers/bulk', {
        method: 'POST',
        headers: buildHeaders(organizationId, undefined, true),
        body: JSON.stringify({ action, customerIds }),
      });

      let payload: CustomerBulkOperationResponse | null = null;

      try {
        payload = (await response.json()) as CustomerBulkOperationResponse;
      } catch {
        throw new Error('No se pudo ejecutar la operacion masiva');
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'No se pudo ejecutar la operacion masiva');
      }

      return payload;
    },
    onSuccess: async (result) => {
      if (result.data.action !== 'export') {
        await queryClient.invalidateQueries({ queryKey: customerKeys.all(organizationId) });
      }

      toast({
        title: 'Operacion completada',
        description: result.message || 'La operacion masiva finalizo correctamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'No se pudo ejecutar la operacion masiva'),
        variant: 'destructive',
      });
    },
  });
}
