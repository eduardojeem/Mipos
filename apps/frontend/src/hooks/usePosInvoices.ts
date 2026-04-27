import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export type PosInvoiceStatus = 'draft' | 'issued' | 'paid' | 'void' | 'overdue';

export type PosInvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: PosInvoiceStatus;
  currency: string;
  issuedDate: string;
  dueDate: string | null;
  customerName: string | null;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type PosInvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PosInvoice = {
  id: string;
  invoiceNumber: string;
  status: PosInvoiceStatus;
  currency: string;
  issuedDate: string;
  dueDate: string | null;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerTaxId: string | null;
  items: PosInvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PosInvoiceListParams = {
  page?: number;
  limit?: number;
  status?: PosInvoiceStatus;
  search?: string;
  fromDate?: string;
  toDate?: string;
};

type NormalizedListParams = {
  page: number;
  limit: number;
  status?: PosInvoiceStatus;
  search: string;
  fromDate: string;
  toDate: string;
};

export type PosInvoiceListResponse = {
  invoices: PosInvoiceListItem[];
  pagination: { page: number; limit: number; total: number };
};

export type PosInvoiceCreateInput = {
  invoiceNumber?: string;
  status?: PosInvoiceStatus;
  currency?: string;
  issuedDate?: string;
  dueDate?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerTaxId?: string | null;
  items: Array<{ id?: string; description: string; quantity: number; unitPrice: number }>;
  discount?: number;
  tax?: number;
  notes?: string;
};

export type PosInvoiceUpdateInput = Partial<PosInvoiceCreateInput> & {
  id: string;
};

function buildHeaders(organizationId: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || undefined);
  headers.set('x-organization-id', organizationId);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  return headers;
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      (payload && typeof payload === 'object' && (payload as any).error) ||
      (payload && typeof payload === 'object' && (payload as any).message) ||
      fallbackMessage;
    throw new Error(String(errorMessage));
  }

  return payload as T;
}

function normalizeListParams(params: PosInvoiceListParams): NormalizedListParams {
  return {
    page: params.page || 1,
    limit: params.limit || 25,
    status: params.status || undefined,
    search: params.search || '',
    fromDate: params.fromDate || '',
    toDate: params.toDate || '',
  };
}

const invoiceKeys = {
  all: (orgId: string | null) => ['pos-invoices', orgId || 'no-org'] as const,
  list: (orgId: string | null, params: NormalizedListParams) =>
    [...invoiceKeys.all(orgId), 'list', params] as const,
  detail: (orgId: string | null, id: string) => [...invoiceKeys.all(orgId), 'detail', id] as const,
};

export function usePosInvoiceList(params: PosInvoiceListParams = {}) {
  const organizationId = useCurrentOrganizationId();
  const memo = useMemo(() => normalizeListParams(params), [params]);

  return useQuery({
    queryKey: invoiceKeys.list(organizationId, memo),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: String(memo.page),
        limit: String(memo.limit),
      });

      if (memo.status) searchParams.set('status', memo.status);
      if (memo.search.trim()) searchParams.set('search', memo.search.trim());
      if (memo.fromDate) searchParams.set('fromDate', memo.fromDate);
      if (memo.toDate) searchParams.set('toDate', memo.toDate);

      const response = await fetch(`/api/pos-invoices?${searchParams.toString()}`, {
        method: 'GET',
        headers: buildHeaders(organizationId!),
        credentials: 'same-origin',
      });

      return parseResponse<PosInvoiceListResponse>(response, 'No se pudo cargar la lista de facturas');
    },
  });
}

export function usePosInvoice(id: string | null) {
  const organizationId = useCurrentOrganizationId();
  const invoiceId = (id || '').trim();

  return useQuery({
    queryKey: invoiceKeys.detail(organizationId, invoiceId || 'missing'),
    enabled: Boolean(organizationId && invoiceId),
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch(`/api/pos-invoices/${encodeURIComponent(invoiceId)}`, {
        method: 'GET',
        headers: buildHeaders(organizationId!),
        credentials: 'same-origin',
      });

      return parseResponse<PosInvoice>(response, 'No se pudo cargar la factura');
    },
  });
}

export function useCreatePosInvoice() {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId();

  return useMutation({
    mutationFn: async (input: PosInvoiceCreateInput) => {
      if (!organizationId) throw new Error('Selecciona una organización');
      const response = await fetch('/api/pos-invoices', {
        method: 'POST',
        headers: buildHeaders(organizationId),
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });

      return parseResponse<{ id: string; invoiceNumber: string }>(response, 'No se pudo crear la factura');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(organizationId) });
    },
  });
}

export function useUpdatePosInvoice() {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId();

  return useMutation({
    mutationFn: async (input: PosInvoiceUpdateInput) => {
      if (!organizationId) throw new Error('Selecciona una organización');
      const response = await fetch(`/api/pos-invoices/${encodeURIComponent(input.id)}`, {
        method: 'PATCH',
        headers: buildHeaders(organizationId),
        credentials: 'same-origin',
        body: JSON.stringify(input),
      });

      return parseResponse<{ id: string; invoiceNumber: string; status: PosInvoiceStatus }>(
        response,
        'No se pudo actualizar la factura'
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(organizationId) });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(organizationId, variables.id) });
      }
    },
  });
}

export function useSeedPosInvoices() {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId();

  return useMutation({
    mutationFn: async (input?: { count?: number; force?: boolean }) => {
      if (!organizationId) throw new Error('Selecciona una organización');
      const response = await fetch('/api/pos-invoices/seed', {
        method: 'POST',
        headers: buildHeaders(organizationId),
        credentials: 'same-origin',
        body: JSON.stringify({
          count: input?.count,
          force: input?.force,
        }),
      });

      return parseResponse<{ inserted: number; skipped: boolean }>(
        response,
        'No se pudieron generar datos de ejemplo'
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all(organizationId) });
    },
  });
}
