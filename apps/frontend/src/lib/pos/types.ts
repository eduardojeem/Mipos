export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'

export interface POSStatsUI {
  todaySales: number
  todayTransactions: number
  averageTicket: number
  topProduct: string
}