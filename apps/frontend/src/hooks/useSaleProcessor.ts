import { useCallback, useRef } from 'react';
import { toast } from '@/lib/toast';
import { calculateCartWithIva, type DiscountType } from '@/lib/pos/calculations';
import { offlineStorage } from '@/lib/pos/offline-storage';
import {
  getClientOperationalContext,
  getOperationalContextHeaders,
} from '@/lib/operational-context';
import {
  createOfflineInternalTicket,
  type PosInternalTicket,
} from '@/lib/pos/internal-ticket';
import type { CartItem } from '@/hooks/useCart';
import type { Customer } from '@/types';
import type { BusinessConfig } from '@/types/business-config';

export interface SalePaymentDetails {
  transferReference?: string;
  cashReceived?: number;
  change?: number;
  paymentMethod?: string;
  mixedPayments?: Array<{
    type: string;
    amount: number;
    details?: { reference?: string };
  }>;
}

export interface SaleOptions {
  autoPrint?: boolean;
  autoSend?: { whatsapp?: boolean; email?: boolean };
  recipientEmail?: string;
  recipientPhone?: string;
  documentType?: 'internal_ticket' | 'invoice';
}

export interface SaleResult {
  sale: PosInternalTicket;
  invoice: { id: string; invoiceNumber: string; status: string; saleId?: string; saleNumber?: string } | null;
  invoiceError?: string;
  isOffline: boolean;
}

interface UseSaleProcessorOptions {
  cart: CartItem[];
  products: any[];
  config: BusinessConfig | any;
  paymentMethod: string;
  notes: string;
  selectedCustomer: Customer | null;
  selectedOrganizationId: string | null;
  userId: string | null;
  isOnline: boolean;
  validateCashPayment: () => Promise<boolean>;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateCartItems(cart: CartItem[]): void {
  for (let i = 0; i < cart.length; i++) {
    const pid = String(cart[i]?.product_id || '').trim();
    if (!pid || !UUID_V4.test(pid)) {
      throw new Error(`Producto inválido en la posición ${i + 1}: ID no es UUID`);
    }
    const qty = Number(cart[i]?.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error(`Cantidad inválida para el producto en la posición ${i + 1}`);
    }
  }
}

function computeCashComponent(
  paymentDetails: SalePaymentDetails | undefined,
  effectivePaymentMethod: string
): number {
  if (paymentDetails && Array.isArray(paymentDetails.mixedPayments)) {
    return paymentDetails.mixedPayments
      .filter((part) => String(part.type || '').toUpperCase() === 'CASH')
      .reduce((sum, part) => sum + Number(part.amount || 0), 0);
  }
  if (effectivePaymentMethod === 'CASH') {
    return Number(paymentDetails?.cashReceived || 0) - Number(paymentDetails?.change || 0);
  }
  return 0;
}

function sanitizeOrganizationId(id: string | null | undefined): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
    return null;
  }
  return trimmed;
}

export function useSaleProcessor(options: UseSaleProcessorOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const processSale = useCallback(
    async (
      newDiscount: number,
      newType: DiscountType,
      paymentDetails?: SalePaymentDetails,
      saleOptions?: SaleOptions
    ): Promise<SaleResult | null> => {
      const {
        cart,
        products,
        config,
        paymentMethod,
        notes,
        selectedCustomer,
        selectedOrganizationId,
        userId,
        isOnline,
        validateCashPayment,
      } = optionsRef.current;

      const effectivePaymentMethod = (paymentDetails?.paymentMethod || paymentMethod) as string;
      const requestedDocumentType = saleOptions?.documentType || 'internal_ticket';

      try {
        // Validate cash session
        const cashComponent = computeCashComponent(paymentDetails, effectivePaymentMethod);
        if (cashComponent > 0 || effectivePaymentMethod === 'CASH') {
          const isValid = await validateCashPayment();
          if (!isValid) {
            toast.error('Caja cerrada: abre una sesión de caja para aceptar pagos en efectivo.');
            return null;
          }
        }

        // Validate cart items
        validateCartItems(cart);

        // Calculate totals
        const totals = calculateCartWithIva(cart, products, newDiscount, newType, config);

        // Build payload
        const payload: Record<string, unknown> = {
          customer_id: selectedCustomer?.id || undefined,
          items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
          discount_amount: totals.discountAmount,
          tax_amount: totals.taxAmount,
          discount_type: newType,
          discount_reason: 'Manual discount',
          payment_method: effectivePaymentMethod,
          total_amount: totals.total,
          notes,
          document_type: requestedDocumentType,
          currency: config?.storeSettings?.currency || 'PYG',
        };

        if (paymentDetails) {
          if (Array.isArray(paymentDetails.mixedPayments) && paymentDetails.mixedPayments.length > 0) {
            payload.mixedPayments = paymentDetails.mixedPayments;
          }
          if (paymentDetails.transferReference) payload.transfer_reference = paymentDetails.transferReference;
          if (paymentDetails.cashReceived !== undefined) payload.cashReceived = paymentDetails.cashReceived;
          if (paymentDetails.change !== undefined) payload.change = paymentDetails.change;
        }

        const organizationHeaderId = sanitizeOrganizationId(selectedOrganizationId);

        // Send request
        const response = await fetch('/api/pos/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(organizationHeaderId ? { 'x-organization-id': organizationHeaderId } : {}),
            ...getOperationalContextHeaders(),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const detail = typeof errorData?.details === 'string'
            ? errorData.details
            : errorData?.details?.message || JSON.stringify(errorData?.details || {});
          const base = errorData.error || 'Error al procesar la venta';
          throw new Error(detail ? `${base}: ${detail}` : base);
        }

        const data = await response.json();

        if (data.invoiceError) {
          toast.warning('Venta registrada, pero la factura requiere revisión', {
            description: String(data.invoiceError),
          });
        } else if (data.invoice) {
          toast.success(`¡Venta y factura ${data.invoice.invoiceNumber} registradas exitosamente!`);
        } else {
          toast.success('¡Venta procesada exitosamente!');
        }

        return {
          sale: data.sale as PosInternalTicket,
          invoice: data.invoice || null,
          invoiceError: data.invoiceError,
          isOffline: false,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error processing sale:', error);

        // Save offline if network error
        if (!isOnline || errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
          const totals = calculateCartWithIva(cart, products, newDiscount, newType, config);
          const operationalContext = getClientOperationalContext();
          const offlineId = offlineStorage.addTransaction('sale', {
            id: `offline-${Date.now()}`,
            user_id: userId || 'unknown',
            organization_id: selectedOrganizationId || 'unknown',
            customer_id: selectedCustomer?.id,
            total_amount: totals.total,
            tax_amount: totals.taxAmount,
            discount_amount: totals.discountAmount,
            discount_type: newType,
            discount_reason: 'Manual discount',
            payment_method: effectivePaymentMethod,
            document_type: requestedDocumentType,
            currency: config?.storeSettings?.currency || 'PYG',
            payment_details: paymentDetails?.mixedPayments
              ? { primaryMethod: effectivePaymentMethod, payments: paymentDetails.mixedPayments }
              : undefined,
            status: 'COMPLETED',
            notes,
            transfer_reference: paymentDetails?.transferReference,
            cash_received: paymentDetails?.cashReceived,
            change: paymentDetails?.change,
            branch_id: operationalContext.branchId,
            pos_id: operationalContext.posId,
            register_id: operationalContext.registerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            items: cart.map((item) => ({
              id: `item-${Date.now()}-${item.product_id}`,
              sale_id: '',
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.price,
              total_price: item.total,
              discount_amount: 0,
            })),
          });

          toast.warning('Venta guardada localmente', {
            description: requestedDocumentType === 'invoice'
              ? 'La venta y la solicitud de factura se sincronizarán automáticamente cuando recuperes la conexión.'
              : 'Se sincronizará automáticamente cuando recuperes la conexión.',
          });

          const offlineSale = createOfflineInternalTicket({
            id: offlineId,
            cart,
            totals: {
              subtotal: totals.subtotal,
              taxAmount: totals.taxAmount,
              discountAmount: totals.discountAmount,
              total: totals.total,
            },
            paymentMethod: effectivePaymentMethod,
            notes,
            customer: selectedCustomer
              ? { name: selectedCustomer.name, phone: selectedCustomer.phone ?? undefined, email: selectedCustomer.email ?? undefined }
              : null,
            customerId: selectedCustomer?.id,
            transferReference: paymentDetails?.transferReference,
            cashReceived: paymentDetails?.cashReceived,
            change: paymentDetails?.change,
            mixedPayments: paymentDetails?.mixedPayments as any[],
          });

          return {
            sale: offlineSale,
            invoice: null,
            isOffline: true,
          };
        }

        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  return { processSale };
}
