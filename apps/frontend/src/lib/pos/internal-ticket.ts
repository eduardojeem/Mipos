export const INTERNAL_TICKET_DOCUMENT_TYPE = 'internal_ticket' as const;
export const INTERNAL_TICKET_LABEL = 'Ticket interno';
export const INTERNAL_TICKET_SUBTITLE = 'Comprobante interno de venta';
export const INTERNAL_TICKET_DISCLAIMER = 'NO VÁLIDO COMO COMPROBANTE FISCAL';
export const INTERNAL_TICKET_DESCRIPTION =
  'Documento interno emitido por el POS. Registra la venta, pero no reemplaza una factura ni un comprobante fiscal legal.';

export type PosPaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'TRANSFER'
  | 'QR'
  | 'OTHER'
  | 'MIXED'
  | string;

export interface PosInternalTicketPaymentPart {
  type: PosPaymentMethod;
  amount: number;
  details?: {
    lastFourDigits?: string;
    cardType?: string;
    authorizationCode?: string;
    reference?: string;
  };
}

export interface PosInternalTicketItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount: number;
}

export interface PosInternalTicket {
  id: string;
  saleNumber: string;
  documentType: typeof INTERNAL_TICKET_DOCUMENT_TYPE;
  documentLabel: string;
  documentNumber: string;
  documentSubtitle: string;
  documentDisclaimer: string;
  documentDescription: string;
  subtotal: number;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: PosPaymentMethod;
  status: string;
  customerId?: string;
  userId?: string;
  notes?: string;
  createdAt: string;
  cashier?: string | null;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  } | null;
  transferReference?: string;
  cashReceived?: number;
  change?: number;
  mixedPayments?: PosInternalTicketPaymentPart[];
  items: PosInternalTicketItem[];
}

interface OfflineTicketParams {
  id: string;
  createdAt?: string;
  cart: Array<{
    id?: string;
    product_id?: string;
    product_name?: string;
    name?: string;
    quantity: number;
    price: number;
    total?: number;
  }>;
  totals: {
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
  };
  paymentMethod: PosPaymentMethod;
  notes?: string;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  } | null;
  cashier?: string | null;
  customerId?: string;
  userId?: string;
  transferReference?: string;
  cashReceived?: number;
  change?: number;
  mixedPayments?: PosInternalTicketPaymentPart[];
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getSuffix(id: string): string {
  const normalized = String(id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8)
    .toUpperCase();

  return normalized || 'TEMP';
}

export function formatInternalTicketNumber(id: string): string {
  return `TKT-${getSuffix(id)}`;
}

export function formatSaleReferenceNumber(id: string): string {
  return `POS-${getSuffix(id)}`;
}

export function buildInternalTicketMetadata(id: string) {
  return {
    documentType: INTERNAL_TICKET_DOCUMENT_TYPE,
    documentLabel: INTERNAL_TICKET_LABEL,
    documentNumber: formatInternalTicketNumber(id),
    documentSubtitle: INTERNAL_TICKET_SUBTITLE,
    documentDisclaimer: INTERNAL_TICKET_DISCLAIMER,
    documentDescription: INTERNAL_TICKET_DESCRIPTION,
  };
}

export function getPaymentMethodLabel(type: PosPaymentMethod): string {
  switch (String(type || '').toUpperCase()) {
    case 'CASH':
      return 'Efectivo';
    case 'CARD':
      return 'Tarjeta';
    case 'TRANSFER':
      return 'Transferencia';
    case 'QR':
      return 'QR';
    case 'MIXED':
      return 'Mixto';
    case 'OTHER':
      return 'Otro';
    default:
      return String(type || 'Otro');
  }
}

function normalizeTicketItems(rawSale: any): PosInternalTicketItem[] {
  const source = Array.isArray(rawSale?.items)
    ? rawSale.items
    : Array.isArray(rawSale?.saleItems)
      ? rawSale.saleItems
      : [];

  return source.map((item: any, index: number) => {
    const quantity = toNumber(item?.quantity, 0);
    const unitPrice = toNumber(
      item?.unitPrice ?? item?.unit_price,
      0,
    );

    return {
      id: toStringValue(item?.id, `${rawSale?.id || 'sale'}-item-${index}`),
      productId: toStringValue(
        item?.productId ?? item?.product_id ?? item?.product?.id,
        '',
      ),
      productName: toStringValue(
        item?.productName ?? item?.product_name ?? item?.product?.name,
        'Producto',
      ),
      quantity,
      unitPrice,
      totalPrice: toNumber(
        item?.totalPrice ?? item?.total_price,
        quantity * unitPrice,
      ),
      discountAmount: toNumber(item?.discountAmount ?? item?.discount_amount, 0),
    };
  });
}

export function normalizePosSaleDocument(rawSale: any, summary?: any): PosInternalTicket {
  const sale = rawSale || {};
  const id = toStringValue(sale?.id, `sale-${Date.now()}`);
  const metadata = buildInternalTicketMetadata(id);

  return {
    id,
    saleNumber: toStringValue(sale?.saleNumber, formatSaleReferenceNumber(id)),
    ...metadata,
    subtotal: toNumber(summary?.subtotal ?? sale?.subtotal, 0),
    totalAmount: toNumber(summary?.total ?? sale?.totalAmount ?? sale?.total, 0),
    taxAmount: toNumber(summary?.tax ?? sale?.taxAmount ?? sale?.tax, 0),
    discountAmount: toNumber(
      summary?.discount ?? sale?.discountAmount ?? sale?.discount,
      0,
    ),
    paymentMethod: toStringValue(
      sale?.paymentMethod ?? sale?.payment_method ?? summary?.paymentMethod,
      'CASH',
    ),
    status: toStringValue(sale?.status, 'COMPLETED'),
    customerId: toOptionalString(sale?.customerId ?? sale?.customer_id),
    userId: toOptionalString(sale?.userId ?? sale?.user_id),
    notes: toStringValue(sale?.notes, ''),
    createdAt: toStringValue(
      sale?.createdAt ?? sale?.created_at ?? sale?.date,
      new Date().toISOString(),
    ),
    cashier: sale?.user?.fullName || sale?.cashier || null,
    customer: sale?.customer
      ? {
          name: toStringValue(sale.customer.name, 'Cliente general'),
          phone: toStringValue(sale.customer.phone, ''),
          email: toStringValue(sale.customer.email, ''),
        }
      : null,
    transferReference: toStringValue(
      sale?.transferReference ?? sale?.transfer_reference,
      '',
    ),
    cashReceived:
      sale?.cashReceived != null ? toNumber(sale.cashReceived, 0) : undefined,
    change: sale?.change != null ? toNumber(sale.change, 0) : undefined,
    mixedPayments: Array.isArray(sale?.mixedPayments)
      ? sale.mixedPayments.map((part: any) => ({
          type: toStringValue(part?.type, 'OTHER'),
          amount: toNumber(part?.amount, 0),
          details: part?.details
            ? {
                lastFourDigits: toStringValue(part.details.lastFourDigits, ''),
                cardType: toStringValue(part.details.cardType, ''),
                authorizationCode: toStringValue(part.details.authorizationCode, ''),
                reference: toStringValue(part.details.reference, ''),
              }
            : undefined,
        }))
      : undefined,
    items: normalizeTicketItems(sale),
  };
}

export function createOfflineInternalTicket({
  id,
  createdAt,
  cart,
  totals,
  paymentMethod,
  notes,
  customer,
  cashier,
  customerId,
  userId,
  transferReference,
  cashReceived,
  change,
  mixedPayments,
}: OfflineTicketParams): PosInternalTicket {
  const metadata = buildInternalTicketMetadata(id);

  return {
    id,
    saleNumber: formatSaleReferenceNumber(id),
    ...metadata,
    subtotal: toNumber(totals.subtotal, 0),
    totalAmount: toNumber(totals.total, 0),
    taxAmount: toNumber(totals.taxAmount, 0),
    discountAmount: toNumber(totals.discountAmount, 0),
    paymentMethod,
    status: 'COMPLETED',
    customerId,
    userId,
    notes: notes || '',
    createdAt: createdAt || new Date().toISOString(),
    cashier: cashier || null,
    customer: customer || null,
    transferReference,
    cashReceived,
    change,
    mixedPayments,
    items: cart.map((item, index) => {
      const quantity = toNumber(item.quantity, 0);
      const unitPrice = toNumber(item.price, 0);

      return {
        id: toStringValue(item.id, `${id}-item-${index}`),
        productId: toStringValue(item.product_id, ''),
        productName: toStringValue(item.product_name ?? item.name, 'Producto'),
        quantity,
        unitPrice,
        totalPrice: toNumber(item.total, quantity * unitPrice),
        discountAmount: 0,
      };
    }),
  };
}
