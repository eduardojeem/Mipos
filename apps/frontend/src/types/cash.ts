export type UserLite = {
  id: string
  fullName?: string | null
  email?: string | null
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
  /** User who opened the session */
  openedByUser?: UserLite | null
  /** User who closed the session */
  closedByUser?: UserLite | null
  /** Associated cash movements (optional, populated on demand) */
  movements?: Array<{
    id: string
    type: string
    amount: number
    reason?: string | null
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
  createdAt: string
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
