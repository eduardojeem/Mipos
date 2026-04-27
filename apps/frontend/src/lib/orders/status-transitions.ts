export const ORDER_STATUS_SEQUENCE = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'SHIPPED',
  'DELIVERED',
] as const;

export const TERMINAL_ORDER_STATUSES = ['CANCELLED', 'DELIVERED'] as const;

export type WorkflowOrderStatus = (typeof ORDER_STATUS_SEQUENCE)[number];
export type TerminalOrderStatus = (typeof TERMINAL_ORDER_STATUSES)[number];
export type OrderStatus = WorkflowOrderStatus | TerminalOrderStatus;

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const ORDER_ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function isKnownOrderStatus(status: string): status is OrderStatus {
  return ALL_ORDER_STATUSES.includes(status as OrderStatus);
}

export function getAllowedOrderStatusTransitions(currentStatus: string): OrderStatus[] {
  if (!isKnownOrderStatus(currentStatus)) {
    return [];
  }

  return ORDER_ALLOWED_TRANSITIONS[currentStatus];
}

export function getOrderStatusSelectOptions(currentStatus: string): OrderStatus[] {
  if (!isKnownOrderStatus(currentStatus)) {
    return [];
  }

  return [currentStatus, ...ORDER_ALLOWED_TRANSITIONS[currentStatus]];
}

export function canTransitionOrderStatus(currentStatus: string, nextStatus: string): boolean {
  if (!isKnownOrderStatus(currentStatus) || !isKnownOrderStatus(nextStatus)) {
    return false;
  }

  if (currentStatus === nextStatus) {
    return true;
  }

  return ORDER_ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus);
}
