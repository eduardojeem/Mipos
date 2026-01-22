import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to combine class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility functions for customer dashboard

/**
 * Format currency value (hydration-safe)
 */
export function formatCurrency(value: number, currency: string = 'USD', locale: string = 'en-US', decimals?: number): string {
  const numValue = Number(value) || 0
  let cur = currency
  let loc = locale
  let dec = decimals
  
  // Only access localStorage on client-side after hydration
  // This prevents hydration mismatches
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem('businessConfig')
      if (raw) {
        const cfg = JSON.parse(raw)
        const storedCurrency = cfg?.storeSettings?.currency
        const storedLocale = cfg?.regional?.locale
        if (!currency && typeof storedCurrency === 'string') cur = storedCurrency
        if (locale === 'en-US' && typeof storedLocale === 'string') loc = storedLocale
        if (typeof dec !== 'number') dec = (storedCurrency === 'PYG' ? 0 : 2)
      }
    } catch {
      // Fallback to defaults on error
    }
  }
  
  const opts: Intl.NumberFormatOptions = { style: 'currency', currency: cur }
  if (typeof dec === 'number') {
    opts.minimumFractionDigits = dec
    opts.maximumFractionDigits = dec
  }
  return new Intl.NumberFormat(loc, opts).format(numValue)
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  const numValue = Number(value) || 0
  return `${(numValue * 100).toFixed(decimals)}%`
}

/**
 * Format plain number with locale and decimals
 */
export function formatNumber(value: number, decimals: number = 2, locale: string = 'en-US'): string {
  const numValue = Number(value) || 0
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue)
}

/**
 * Format date
 */
export function formatDate(date: Date | string, format: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }
  
  if (format === 'MM/dd/yyyy') {
    return dateObj.toLocaleDateString('en-US')
  } else if (format === 'dd-MM-yyyy') {
    return dateObj.toLocaleDateString('en-GB').split('/').join('-')
  }
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}

/**
 * Generate customer code
 */
export function generateCustomerCode(name: string): string {
  if (!name || !name.trim()) {
    return `CUST-UNK-${Date.now().toString(36).toUpperCase()}`
  }
  
  const cleanName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
  const parts = cleanName.trim().split(/\s+|-/)
  
  let initials = ''
  for (const part of parts) {
    if (part.length > 0) {
      initials += part[0].toUpperCase()
    }
  }
  
  if (initials.length === 0) {
    initials = 'UNK'
  }
  
  const timestamp = Date.now().toString(36).toUpperCase()
  return `CUST-${initials}-${timestamp}`
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone format
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/ // Simple international phone validation
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 7
}

/**
 * Calculate customer metrics
 */
export function calculateCustomerMetrics(customers: any[]) {
  if (!customers || customers.length === 0) {
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      averageCustomerValue: 0,
    }
  }

  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.status === 'active').length
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0)
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const averageCustomerValue = totalRevenue / totalCustomers

  return {
    totalCustomers,
    activeCustomers,
    totalRevenue,
    averageOrderValue,
    averageCustomerValue,
  }
}

/**
 * Group customers by segment
 */
export function groupCustomersBySegment(customers: any[]) {
  const segments: Record<string, { count: number; totalRevenue: number; customers: any[] }> = {}

  customers.forEach(customer => {
    const segment = customer.segment || 'Unknown'
    if (!segments[segment]) {
      segments[segment] = { count: 0, totalRevenue: 0, customers: [] }
    }
    
    segments[segment].count++
    segments[segment].totalRevenue += customer.total_spent || 0
    segments[segment].customers.push(customer)
  })

  return Object.entries(segments).map(([segment, data]) => ({
    segment,
    count: data.count,
    totalRevenue: data.totalRevenue,
    averageRevenue: data.count > 0 ? data.totalRevenue / data.count : 0,
    percentage: (data.count / customers.length) * 100,
  })).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

/**
 * Group customers by country
 */
export function groupCustomersByCountry(customers: any[]) {
  const countries: Record<string, { count: number; totalRevenue: number; customers: any[] }> = {}

  customers.forEach(customer => {
    const country = customer.country || 'Unknown'
    if (!countries[country]) {
      countries[country] = { count: 0, totalRevenue: 0, customers: [] }
    }
    
    countries[country].count++
    countries[country].totalRevenue += customer.total_spent || 0
    countries[country].customers.push(customer)
  })

  return Object.entries(countries).map(([country, data]) => ({
    country,
    count: data.count,
    totalRevenue: data.totalRevenue,
    averageRevenue: data.count > 0 ? data.totalRevenue / data.count : 0,
    percentage: (data.count / customers.length) * 100,
  })).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

/**
 * Filter customers based on criteria
 */
export function filterCustomers(customers: any[], filters: {
  query?: string
  status?: string
  customerType?: string
  country?: string
  segment?: string
  riskLevel?: string
  minSpending?: number
  maxSpending?: number
  dateRange?: { start: string; end: string }
}) {
  return customers.filter(customer => {
    // Search query filter
    if (filters.query) {
      const query = filters.query.toLowerCase()
      const searchableFields = [
        customer.name,
        customer.email,
        customer.customer_code,
        customer.phone,
      ].filter(Boolean).join(' ').toLowerCase()
      
      if (!searchableFields.includes(query)) {
        return false
      }
    }

    // Status filter
    if (filters.status && customer.status !== filters.status) {
      return false
    }

    // Customer type filter
    if (filters.customerType && customer.customer_type !== filters.customerType) {
      return false
    }

    // Country filter
    if (filters.country && customer.country !== filters.country) {
      return false
    }

    // Segment filter
    if (filters.segment && customer.segment !== filters.segment) {
      return false
    }

    // Risk level filter
    if (filters.riskLevel && customer.risk_level !== filters.riskLevel) {
      return false
    }

    // Spending range filter
    if (filters.minSpending !== undefined && (customer.total_spent || 0) < filters.minSpending) {
      return false
    }
    if (filters.maxSpending !== undefined && (customer.total_spent || 0) > filters.maxSpending) {
      return false
    }

    // Date range filter
    if (filters.dateRange) {
      const customerDate = new Date(customer.created_at)
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      
      if (customerDate < startDate || customerDate > endDate) {
        return false
      }
    }

    return true
  })
}

/**
 * Sort customers by field
 */
export function sortCustomers(customers: any[], field: string, order: 'asc' | 'desc' = 'asc') {
  return [...customers].sort((a, b) => {
    let aVal = a[field]
    let bVal = b[field]

    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    // Handle different data types
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      // Numbers are already in correct format
    } else if (aVal instanceof Date && bVal instanceof Date) {
      aVal = aVal.getTime()
      bVal = bVal.getTime()
    } else {
      // Convert to strings for comparison
      aVal = String(aVal)
      bVal = String(bVal)
    }

    if (order === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    }
  })
}

/**
 * Get high value threshold for sales filtering
 */
export function getHighValueThreshold(): number {
  return 1000; // Threshold for high-value sales in USD
}