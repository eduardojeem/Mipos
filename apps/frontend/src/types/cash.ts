export type UserLite = {
  id: string
  fullName?: string | null
  email?: string | null
}

export interface CashPaymentMethodSummary {
  method: string
  label: string
  amount: number
  count: number
  affectsCash: boolean
}

export interface CashSessionSummary {
  movementCount: number
  movementTypeCounts: {
    IN: number
    OUT: number
    SALE: number
    RETURN: number
    ADJUSTMENT: number
  }
  lastMovementAt?: string | null
  totalSold: number
  totalRefunded: number
  salesCount: number
  returnsCount: number
  manualIn: number
  manualOut: number
  cashSales: number
  refunds: number
  adjustments: number
  netCashFlow: number
  expectedCash: number
  actualCash?: number | null
  differenceAmount?: number | null
  paymentMethods: CashPaymentMethodSummary[]
  refundMethods: CashPaymentMethodSummary[]
}

/**
 * Cash session representing a period of cash register operation
 * Maps to cash_sessions table in database
 */
export interface CashSession {
  id: string
  /** Session status: 'OPEN', 'CLOSED', 'CANCELLED' */
  status: string
  /** Opening balance amount */
  openingAmount: number
  /** Closing balance amount (null if session still open) */
  closingAmount?: number | null
  /** System calculated expected balance */
  systemExpected?: number | null
  /** Difference between closing and expected amounts */
  discrepancyAmount?: number | null
  /** Timestamp when session was opened */
  openedAt?: string
  /** NEW: Timestamp when session was opened (new schema) */
  opening_time?: string
  /** Timestamp when session was closed (null if still open) */
  closedAt?: string | null
  /** NEW: Timestamp when session was closed (new schema) */
  closing_time?: string | null
  /** Optional notes or reconciliation notes */
  notes?: string | null
  /** Optional branch/location associated to the session */
  branchId?: string | null
  /** Optional POS/register associated to the session */
  posId?: string | null
  /** User who opened the session */
  openedByUser?: UserLite | null
  /** User who closed the session */
  closedByUser?: UserLite | null
  /** Consolidated session analytics for dashboard/history */
  summary?: CashSessionSummary
  /** Associated cash movements (optional, populated on demand) */
  movements?: Array<{
    id: string
    type: string
    amount: number
    reason?: string | null
    createdByUser?: UserLite | null
  }>
  /** Cash count details (optional, populated on demand) */
  counts?: Array<{
    denomination: number
    quantity: number
    total: number
  }>
}

export interface CashMovement {
  id: string
  sessionId: string
  type: string
  amount: number
  reason?: string | null
  referenceType?: string | null
  referenceId?: string | null
  branchId?: string | null
  posId?: string | null
  createdAt: string
  createdBy?: string | null
  createdByUser?: UserLite | null
}

export interface CashReport {
  id: string
  sessionId: string
  reportType: string
  period: string
  data: any
  generatedAt: string
  generatedByUser?: UserLite | null
}
