import type { BusinessConfig } from '@/types/business-config';

export type PaymentMethodCode = 'CASH' | 'CARD' | 'TRANSFER';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
};

/**
 * Formatea un código de método de pago al label de UI.
 * Acepta strings desconocidos (devuelve el string tal cual) para no
 * romper en datos legacy.
 */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return '';
  return PAYMENT_METHOD_LABELS[method as PaymentMethodCode] || method;
}

/**
 * Deriva la lista de métodos de pago habilitados según la config del
 * tenant. Si los toggles no están seteados, se asume que están todos
 * habilitados (backwards compatible).
 */
export function getEnabledPaymentMethods(config: BusinessConfig | undefined): PaymentMethodCode[] {
  const store = config?.storeSettings;
  // Default: todos true si la config no los define
  const acceptsCash = store?.acceptsCash ?? true;
  const acceptsCard = (store?.acceptsCreditCards ?? true) || (store?.acceptsDebitCards ?? true);
  const acceptsTransfer = store?.acceptsBankTransfer ?? true;

  const enabled: PaymentMethodCode[] = [];
  if (acceptsCash) enabled.push('CASH');
  if (acceptsCard) enabled.push('CARD');
  if (acceptsTransfer) enabled.push('TRANSFER');
  // Si por algún motivo el tenant deshabilitó todo, no dejamos al user
  // bloqueado: devolvemos CASH como fallback (es el default de la app).
  return enabled.length > 0 ? enabled : ['CASH'];
}
