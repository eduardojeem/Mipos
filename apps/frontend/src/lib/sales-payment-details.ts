export type SalePaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'QR' | 'OTHER' | 'MIXED'
export type LegacySalePaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'

export interface SalePaymentAllocation {
  method: Exclude<SalePaymentMethod, 'MIXED'>
  amount: number
  affectsCash: boolean
  reference?: string | null
  details?: Record<string, unknown> | null
}

export interface StoredSalePaymentDetails {
  version: 1
  primaryMethod: SalePaymentMethod
  legacyMethod: LegacySalePaymentMethod
  payments: SalePaymentAllocation[]
  cashAmount: number
  cashReceived?: number | null
  change?: number | null
  transferReference?: string | null
}

interface PaymentDetailsInput {
  version?: number
  primaryMethod?: unknown
  payments?: unknown
  cashAmount?: unknown
  cashReceived?: unknown
  change?: unknown
  transferReference?: unknown
}

interface MixedPaymentInput {
  type?: unknown
  method?: unknown
  amount?: unknown
  details?: unknown
}

function toNumber(value: unknown): number {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export function normalizeSalePaymentMethod(
  value: unknown,
  fallback: SalePaymentMethod = 'CASH',
): SalePaymentMethod {
  const raw = String(value || '').trim().toUpperCase()
  if (!raw) return fallback
  if (raw === 'CASH' || raw === 'EFECTIVO') return 'CASH'
  if (raw === 'CARD' || raw === 'TARJETA') return 'CARD'
  if (raw === 'TRANSFER' || raw === 'TRANSFERENCIA' || raw === 'BANK_TRANSFER') return 'TRANSFER'
  if (raw === 'QR' || raw === 'DIGITAL_WALLET') return 'QR'
  if (raw === 'MIXED' || raw === 'SPLIT') return 'MIXED'
  if (raw === 'OTHER' || raw === 'OTRO') return 'OTHER'
  return fallback
}

export function toLegacySalePaymentMethod(method: SalePaymentMethod): LegacySalePaymentMethod {
  if (method === 'QR') return 'TRANSFER'
  if (method === 'MIXED') return 'OTHER'
  return method
}

function normalizeAllocation(
  input: MixedPaymentInput,
  fallbackReference?: string | null,
): SalePaymentAllocation | null {
  const method = normalizeSalePaymentMethod(input.method ?? input.type, 'OTHER')
  if (method === 'MIXED') return null

  const amount = toNumber(input.amount)
  if (amount <= 0) return null

  const details =
    input.details && typeof input.details === 'object'
      ? input.details as Record<string, unknown>
      : null

  const reference =
    typeof details?.reference === 'string' && details.reference.trim()
      ? details.reference.trim()
      : method === 'TRANSFER' || method === 'QR'
        ? fallbackReference || null
        : null

  return {
    method,
    amount,
    affectsCash: method === 'CASH',
    reference,
    details,
  }
}

export function buildSalePaymentDetails(params: {
  paymentMethod?: unknown
  totalAmount?: unknown
  mixedPayments?: unknown
  paymentDetails?: unknown
  cashReceived?: unknown
  change?: unknown
  transferReference?: unknown
}): StoredSalePaymentDetails {
  const totalAmount = Math.max(0, toNumber(params.totalAmount))
  const transferReference =
    typeof params.transferReference === 'string' && params.transferReference.trim()
      ? params.transferReference.trim()
      : null

  const storedInput =
    params.paymentDetails && typeof params.paymentDetails === 'object'
      ? params.paymentDetails as PaymentDetailsInput
      : null

  const mixedPayments = Array.isArray(params.mixedPayments)
    ? params.mixedPayments
        .map((payment) => normalizeAllocation(payment as MixedPaymentInput, transferReference))
        .filter((payment): payment is SalePaymentAllocation => Boolean(payment))
    : []

  const storedPayments = Array.isArray(storedInput?.payments)
    ? storedInput.payments
        .map((payment) => normalizeAllocation(payment as MixedPaymentInput, transferReference))
        .filter((payment): payment is SalePaymentAllocation => Boolean(payment))
    : []

  let payments = mixedPayments.length > 0 ? mixedPayments : storedPayments
  const requestedMethod = normalizeSalePaymentMethod(
    storedInput?.primaryMethod ?? params.paymentMethod,
    'CASH',
  )

  if (payments.length === 0) {
    const singleMethod = requestedMethod === 'MIXED' ? 'OTHER' : requestedMethod
    payments = totalAmount > 0
      ? [
          {
            method: singleMethod,
            amount: totalAmount,
            affectsCash: singleMethod === 'CASH',
            reference:
              singleMethod === 'TRANSFER' || singleMethod === 'QR'
                ? transferReference
                : null,
            details: null,
          },
        ]
      : []
  }

  const paymentTotal = payments.reduce((sum, payment) => sum + payment.amount, 0)
  if (payments.length > 0 && totalAmount > 0 && Math.abs(paymentTotal - totalAmount) > 0.01) {
    const delta = totalAmount - paymentTotal
    const last = payments[payments.length - 1]
    payments = [
      ...payments.slice(0, -1),
      {
        ...last,
        amount: Math.max(0, last.amount + delta),
      },
    ]
  }

  const primaryMethod =
    requestedMethod === 'MIXED' || payments.length > 1
      ? 'MIXED'
      : payments[0]?.method ?? requestedMethod

  const cashAmount = payments
    .filter((payment) => payment.method === 'CASH')
    .reduce((sum, payment) => sum + payment.amount, 0)

  return {
    version: 1,
    primaryMethod,
    legacyMethod: toLegacySalePaymentMethod(primaryMethod),
    payments,
    cashAmount,
    cashReceived:
      params.cashReceived != null ? toNumber(params.cashReceived) : toNumber(storedInput?.cashReceived) || null,
    change:
      params.change != null ? toNumber(params.change) : toNumber(storedInput?.change) || null,
    transferReference: transferReference || normalizeString(storedInput?.transferReference),
  }
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function parseStoredSalePaymentDetails(
  raw: unknown,
  fallback?: { payment_method?: unknown; total_amount?: unknown },
): StoredSalePaymentDetails {
  return buildSalePaymentDetails({
    paymentDetails: raw,
    paymentMethod: fallback?.payment_method,
    totalAmount: fallback?.total_amount,
  })
}

export function getSaleDisplayPaymentMethod(
  raw: unknown,
  fallback?: { payment_method?: unknown; total_amount?: unknown },
): SalePaymentMethod {
  return parseStoredSalePaymentDetails(raw, fallback).primaryMethod
}
