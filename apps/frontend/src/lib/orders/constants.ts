import { CheckCircle, Clock, Package, Truck, XCircle } from 'lucide-react';
import { ORDER_STATUS_SEQUENCE, TERMINAL_ORDER_STATUSES } from './status-transitions';

export const ORDER_STATUSES = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    // Colores para la lista (page.tsx)
    listClassName: 'bg-amber-100 text-amber-900 border-amber-200',
    // Colores para el modal (con soporte dark)
    modalClassName:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  },
  CONFIRMED: {
    label: 'Confirmado',
    icon: CheckCircle,
    listClassName: 'bg-blue-100 text-blue-900 border-blue-200',
    modalClassName:
      'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  PREPARING: {
    label: 'Preparando',
    icon: Package,
    listClassName: 'bg-orange-100 text-orange-900 border-orange-200',
    modalClassName:
      'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  },
  READY: {
    label: 'Listo',
    icon: CheckCircle,
    listClassName: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    modalClassName:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
  SHIPPED: {
    label: 'Enviado',
    icon: Truck,
    listClassName: 'bg-violet-100 text-violet-900 border-violet-200',
    modalClassName:
      'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  },
  DELIVERED: {
    label: 'Entregado',
    icon: CheckCircle,
    listClassName: 'bg-teal-100 text-teal-900 border-teal-200',
    modalClassName:
      'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: XCircle,
    listClassName: 'bg-rose-100 text-rose-900 border-rose-200',
    modalClassName:
      'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  },
} as const;

export type OrderStatusKey = keyof typeof ORDER_STATUSES;

export const PAYMENT_METHODS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  DIGITAL_WALLET: 'Billetera digital',
};

/** Estados considerados "terminales" que requieren confirmación para cambiar. */
export const TERMINAL_STATUSES = new Set<string>(TERMINAL_ORDER_STATUSES);

/** Flujo lineal de estados excluyendo CANCELLED. */
export const STATUS_FLOW: OrderStatusKey[] = [...ORDER_STATUS_SEQUENCE];
