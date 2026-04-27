import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  payment_status?: string;
  status: string;
  notes?: string;
  order_source: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  order_status_history?: OrderStatusHistoryEntry[];
  organization_id: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products?: {
    name: string;
    image_url?: string;
  };
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: string;
  notes?: string;
  changed_at: string;
  changed_by?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
  sortBy?: 'created_at' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  todayRevenue: number;
  todayOrders: number;
  avgOrderValue: number;
}

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: OrderPagination;
}

export interface DashboardCreateOrderInput {
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  selectedCustomerId?: string | null;
  newCustomer?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'DIGITAL_WALLET';
  notes?: string | null;
  shippingCost?: number | null;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
  details?: string;
  message?: string;
};

const NO_ORGANIZATION_KEY = 'no-organization';

export const orderKeys = {
  root: ['orders'] as const,
  all: (organizationId?: string | null) =>
    [...orderKeys.root, organizationId || NO_ORGANIZATION_KEY] as const,
  lists: (organizationId?: string | null) => [...orderKeys.all(organizationId), 'list'] as const,
  list: (organizationId: string | null | undefined, params: Required<OrderListParams>) =>
    [...orderKeys.lists(organizationId), params] as const,
  stats: (organizationId?: string | null) => [...orderKeys.all(organizationId), 'stats'] as const,
  detail: (organizationId: string | null | undefined, orderId: string) =>
    [...orderKeys.all(organizationId), 'detail', orderId] as const,
};

function buildHeaders(organizationId: string, init?: RequestInit, includeJson = false): Headers {
  const headers = new Headers(init?.headers);
  headers.set('x-organization-id', organizationId);

  if (includeJson && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || payload?.details || fallbackMessage);
  }

  return payload.data;
}

async function fetchOrderData<T>(
  input: string,
  organizationId: string,
  init?: RequestInit,
  fallbackMessage: string = 'No se pudo cargar la informacion de pedidos'
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: buildHeaders(organizationId, init, false),
    credentials: 'same-origin',
  });

  return parseJsonResponse<T>(response, fallbackMessage);
}

function normalizeOrderListParams(params: OrderListParams): Required<OrderListParams> {
  return {
    page: params.page || 1,
    limit: params.limit || 20,
    status: params.status || 'ALL',
    search: params.search || '',
    dateRange: params.dateRange || 'all',
    sortBy: params.sortBy || 'created_at',
    sortOrder: params.sortOrder || 'desc',
  };
}

function normalizeOrderItem(item: Partial<OrderItem>): OrderItem {
  const unitPrice = Number(item.unit_price || 0);
  const quantity = Number(item.quantity || 0);

  return {
    id: String(item.id || ''),
    product_id: String(item.product_id || ''),
    product_name: String(item.product_name || item.products?.name || 'Producto'),
    quantity,
    unit_price: unitPrice,
    subtotal: Number(item.subtotal || unitPrice * quantity),
    products: item.products
      ? {
          name: String(item.products.name || item.product_name || 'Producto'),
          image_url: item.products.image_url,
        }
      : undefined,
  };
}

function normalizeOrderStatusHistoryEntry(
  entry: Partial<OrderStatusHistoryEntry>
): OrderStatusHistoryEntry {
  return {
    id: String(entry.id || ''),
    status: String(entry.status || 'PENDING'),
    notes: entry.notes ? String(entry.notes) : '',
    changed_at: String(entry.changed_at || ''),
    changed_by: entry.changed_by ? String(entry.changed_by) : '',
  };
}

function normalizeOrder(order: Partial<Order>): Order {
  return {
    id: String(order.id || ''),
    order_number: String(order.order_number || order.id || ''),
    customer_name: String(order.customer_name || 'Cliente'),
    customer_email: String(order.customer_email || ''),
    customer_phone: String(order.customer_phone || ''),
    customer_address: order.customer_address ? String(order.customer_address) : '',
    subtotal: Number(order.subtotal || 0),
    shipping_cost: Number(order.shipping_cost || 0),
    total: Number(order.total || 0),
    payment_method: String(order.payment_method || 'CASH'),
    payment_status: String(order.payment_status || 'PENDING'),
    status: String(order.status || 'PENDING'),
    notes: order.notes ? String(order.notes) : '',
    order_source: String(order.order_source || 'MANUAL'),
    created_at: String(order.created_at || ''),
    updated_at: String(order.updated_at || order.created_at || ''),
    order_items: Array.isArray(order.order_items)
      ? order.order_items.map((item) => normalizeOrderItem(item))
      : [],
    order_status_history: Array.isArray(order.order_status_history)
      ? order.order_status_history
          .map((entry) => normalizeOrderStatusHistoryEntry(entry))
          .sort((left, right) => {
            const leftTime = left.changed_at ? new Date(left.changed_at).getTime() : 0;
            const rightTime = right.changed_at ? new Date(right.changed_at).getTime() : 0;
            return rightTime - leftTime;
          })
      : [],
    organization_id: String(order.organization_id || ''),
  };
}

export function useOptimizedOrders(params: OrderListParams = {}) {
  const organizationId = useCurrentOrganizationId();
  const memoizedParams = useMemo(() => normalizeOrderListParams(params), [params]);

  return useQuery({
    queryKey: orderKeys.list(organizationId, memoizedParams),
    queryFn: async (): Promise<OrderListResponse> => {
      const searchParams = new URLSearchParams({
        page: String(memoizedParams.page),
        limit: String(memoizedParams.limit),
        status: memoizedParams.status,
        dateRange: memoizedParams.dateRange,
        sortBy: memoizedParams.sortBy,
        sortOrder: memoizedParams.sortOrder,
      });

      if (memoizedParams.search.trim()) {
        searchParams.set('search', memoizedParams.search.trim());
      }

      const data = await fetchOrderData<{
        orders: Order[];
        pagination: OrderPagination;
      }>(
        `/api/orders?${searchParams.toString()}`,
        organizationId!,
        undefined,
        'No se pudo cargar la lista de pedidos'
      );

      return {
        orders: (data.orders || []).map((order) => normalizeOrder(order)),
        pagination: data.pagination,
      };
    },
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useOrderStats() {
  const organizationId = useCurrentOrganizationId();

  return useQuery({
    queryKey: orderKeys.stats(organizationId),
    queryFn: () =>
      fetchOrderData<OrderStats>(
        '/api/orders/stats',
        organizationId!,
        undefined,
        'No se pudo cargar el resumen de pedidos'
      ),
    enabled: Boolean(organizationId),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useOrderDetail(orderId?: string | null) {
  const organizationId = useCurrentOrganizationId();

  return useQuery({
    queryKey: orderKeys.detail(organizationId, orderId || 'unknown'),
    queryFn: async (): Promise<Order> => {
      if (!orderId) {
        throw new Error('Pedido no encontrado');
      }

      const data = await fetchOrderData<{ order: Order }>(
        `/api/orders/${orderId}`,
        organizationId!,
        undefined,
        'No se pudo cargar el detalle del pedido'
      );

      return normalizeOrder(data.order);
    },
    enabled: Boolean(organizationId && orderId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateOrderStatus() {
  const organizationId = useCurrentOrganizationId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      if (!organizationId) {
        throw new Error('No se encontro una organizacion activa');
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: buildHeaders(organizationId, undefined, true),
        credentials: 'same-origin',
        body: JSON.stringify({ status }),
      });

      return parseJsonResponse<{ order: Order }>(
        response,
        'No se pudo actualizar el estado del pedido'
      );
    },
    onSuccess: ({ order }, { orderId }) => {
      queryClient.setQueryData(
        orderKeys.detail(organizationId, orderId),
        (currentOrder: Order | undefined) =>
          currentOrder
            ? normalizeOrder({
                ...currentOrder,
                ...order,
                order_items: currentOrder.order_items,
                order_status_history: currentOrder.order_status_history,
              })
            : currentOrder
      );
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(organizationId, orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists(organizationId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.stats(organizationId) });
      queryClient.invalidateQueries({ queryKey: ['dashboard-optimized-summary'] });
    },
  });
}

export function useCreateDashboardOrder() {
  const organizationId = useCurrentOrganizationId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DashboardCreateOrderInput) => {
      if (!organizationId) {
        throw new Error('No se encontro una organizacion activa');
      }

      const response = await fetch('/api/orders/admin', {
        method: 'POST',
        headers: buildHeaders(organizationId, undefined, true),
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      return parseJsonResponse<{
        order: {
          id: string;
          orderNumber: string;
          status: string;
          total: number;
          createdAt: string;
        };
      }>(response, 'No se pudo crear la orden');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all(organizationId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-list'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-optimized-summary'] });
      queryClient.invalidateQueries({ queryKey: ['sales-summary-optimized'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sales-optimized'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}
