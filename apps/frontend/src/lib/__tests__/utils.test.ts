import { describe, it, expect } from 'vitest'
import { 
  formatCurrency, 
  formatPercentage, 
  formatDate, 
  debounce,
  generateCustomerCode,
  validateEmail,
  validatePhone,
  calculateCustomerMetrics,
  groupCustomersBySegment,
  groupCustomersByCountry,
  filterCustomers,
  sortCustomers
} from '../utils'

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('formats USD currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(1000.5)).toBe('$1,000.50')
      expect(formatCurrency(0)).toBe('$0.00')
      expect(formatCurrency(-1000)).toBe('-$1,000.00')
    })

    it('handles different currencies', () => {
      expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00')
      expect(formatCurrency(1000, 'GBP')).toBe('£1,000.00')
    })

    it('handles undefined and null values', () => {
      expect(formatCurrency(undefined)).toBe('$0.00')
      expect(formatCurrency(null as any)).toBe('$0.00')
    })
  })

  describe('formatPercentage', () => {
    it('formats percentages correctly', () => {
      expect(formatPercentage(0.1234)).toBe('12.34%')
      expect(formatPercentage(1)).toBe('100.00%')
      expect(formatPercentage(-0.05)).toBe('-5.00%')
      expect(formatPercentage(0)).toBe('0.00%')
    })

    it('handles decimal places parameter', () => {
      expect(formatPercentage(0.1234, 1)).toBe('12.3%')
      expect(formatPercentage(0.1234, 0)).toBe('12%')
    })

    it('handles undefined and null values', () => {
      expect(formatPercentage(undefined)).toBe('0.00%')
      expect(formatPercentage(null as any)).toBe('0.00%')
    })
  })

  describe('formatDate', () => {
    it('formats dates correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      expect(formatDate(date)).toBe('Jan 15, 2024')
    })

    it('handles ISO date strings', () => {
      expect(formatDate('2024-01-15T12:00:00Z')).toBe('Jan 15, 2024')
    })

    it('handles different formats', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      expect(formatDate(date, 'MM/dd/yyyy')).toBe('01/15/2024')
      expect(formatDate(date, 'dd-MM-yyyy')).toBe('15-01-2024')
    })

    it('handles invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date')
      expect(formatDate(null as any)).toBe('Invalid Date')
    })
  })

  describe('debounce', () => {
    it('delays function execution', async () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('test')
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledWith('test')

      vi.useRealTimers()
    })

    it('cancels previous calls', async () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('first')
      vi.advanceTimersByTime(50)
      debouncedFn('second')
      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('second')

      vi.useRealTimers()
    })

    it('handles immediate execution', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100, true)

      debouncedFn('immediate')
      expect(fn).toHaveBeenCalledWith('immediate')
    })
  })

  describe('generateCustomerCode', () => {
    it('generates customer codes correctly', () => {
      expect(generateCustomerCode('John Doe')).toMatch(/^CUST-JDOE-/)
      expect(generateCustomerCode('Jane Smith')).toMatch(/^CUST-JSMI-/)
    })

    it('handles single names', () => {
      expect(generateCustomerCode('John')).toMatch(/^CUST-JOHN-/)
    })

    it('handles empty names', () => {
      expect(generateCustomerCode('')).toMatch(/^CUST-UNK-/)
    })

    it('handles special characters', () => {
      expect(generateCustomerCode('José García')).toMatch(/^CUST-JGAR-/)
      expect(generateCustomerCode('Mary-Jane')).toMatch(/^CUST-MJAN-/)
    })

    it('generates unique codes', () => {
      const code1 = generateCustomerCode('John Doe')
      const code2 = generateCustomerCode('John Doe')
      expect(code1).not.toBe(code2)
    })
  })

  describe('validateEmail', () => {
    it('validates correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })

    it('rejects invalid email formats', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('user@')).toBe(false)
      expect(validateEmail('user@.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validatePhone', () => {
    it('validates phone numbers', () => {
      expect(validatePhone('+1234567890')).toBe(true)
      expect(validatePhone('123-456-7890')).toBe(true)
      expect(validatePhone('(123) 456-7890')).toBe(true)
      expect(validatePhone('+44 20 7946 0958')).toBe(true)
    })

    it('rejects invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false)
      expect(validatePhone('invalid')).toBe(false)
      expect(validatePhone('')).toBe(false)
    })
  })

  describe('calculateCustomerMetrics', () => {
    const mockCustomers = [
      {
        id: '1',
        status: 'active',
        total_spent: 1000,
        total_orders: 10,
        average_order_value: 100,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        status: 'inactive',
        total_spent: 500,
        total_orders: 5,
        average_order_value: 100,
        created_at: '2024-02-01T00:00:00Z',
      },
      {
        id: '3',
        status: 'active',
        total_spent: 1500,
        total_orders: 15,
        average_order_value: 100,
        created_at: '2024-03-01T00:00:00Z',
      },
    ]

    it('calculates customer metrics correctly', () => {
      const metrics = calculateCustomerMetrics(mockCustomers)

      expect(metrics.totalCustomers).toBe(3)
      expect(metrics.activeCustomers).toBe(2)
      expect(metrics.totalRevenue).toBe(3000)
      expect(metrics.averageOrderValue).toBe(100)
      expect(metrics.averageCustomerValue).toBe(1000)
    })

    it('handles empty customer array', () => {
      const metrics = calculateCustomerMetrics([])

      expect(metrics.totalCustomers).toBe(0)
      expect(metrics.activeCustomers).toBe(0)
      expect(metrics.totalRevenue).toBe(0)
      expect(metrics.averageOrderValue).toBe(0)
    })

    it('handles customers with missing data', () => {
      const incompleteCustomers = [
        { id: '1', status: 'active' },
        { id: '2', total_spent: 1000 },
      ]

      const metrics = calculateCustomerMetrics(incompleteCustomers as any)

      expect(metrics.totalCustomers).toBe(2)
      expect(metrics.totalRevenue).toBe(1000)
    })
  })

  describe('groupCustomersBySegment', () => {
    const mockCustomers = [
      { id: '1', segment: 'retail', total_spent: 1000 },
      { id: '2', segment: 'wholesale', total_spent: 5000 },
      { id: '3', segment: 'retail', total_spent: 1500 },
      { id: '4', segment: 'corporate', total_spent: 10000 },
    ]

    it('groups customers by segment correctly', () => {
      const grouped = groupCustomersBySegment(mockCustomers as any)

      expect(grouped).toHaveLength(3)
      expect(grouped.find(g => g.segment === 'retail')?.count).toBe(2)
      expect(grouped.find(g => g.segment === 'wholesale')?.count).toBe(1)
      expect(grouped.find(g => g.segment === 'corporate')?.count).toBe(1)
    })

    it('calculates segment revenue correctly', () => {
      const grouped = groupCustomersBySegment(mockCustomers as any)

      const retail = grouped.find(g => g.segment === 'retail')
      expect(retail?.totalRevenue).toBe(2500)
      expect(retail?.averageRevenue).toBe(1250)
    })

    it('handles customers without segments', () => {
      const customersWithoutSegment = [
        { id: '1', total_spent: 1000 },
        { id: '2', segment: 'retail', total_spent: 2000 },
      ]

      const grouped = groupCustomersBySegment(customersWithoutSegment as any)

      expect(grouped).toHaveLength(2)
      expect(grouped.find(g => g.segment === 'Unknown')?.count).toBe(1)
    })

    it('handles empty customer array', () => {
      const grouped = groupCustomersBySegment([])

      expect(grouped).toHaveLength(0)
    })
  })

  describe('groupCustomersByCountry', () => {
    const mockCustomers = [
      { id: '1', country: 'USA', total_spent: 1000 },
      { id: '2', country: 'Canada', total_spent: 1500 },
      { id: '3', country: 'USA', total_spent: 2000 },
      { id: '4', country: 'UK', total_spent: 3000 },
    ]

    it('groups customers by country correctly', () => {
      const grouped = groupCustomersByCountry(mockCustomers as any)

      expect(grouped).toHaveLength(3)
      expect(grouped.find(g => g.country === 'USA')?.count).toBe(2)
      expect(grouped.find(g => g.country === 'Canada')?.count).toBe(1)
      expect(grouped.find(g => g.country === 'UK')?.count).toBe(1)
    })

    it('calculates country revenue correctly', () => {
      const grouped = groupCustomersByCountry(mockCustomers as any)

      const usa = grouped.find(g => g.country === 'USA')
      expect(usa?.totalRevenue).toBe(3000)
      expect(usa?.averageRevenue).toBe(1500)
    })

    it('sorts countries by revenue by default', () => {
      const grouped = groupCustomersByCountry(mockCustomers as any)

      expect(grouped[0].country).toBe('UK') // Highest revenue
      expect(grouped[1].country).toBe('USA') // Second highest
    })

    it('handles customers without countries', () => {
      const customersWithoutCountry = [
        { id: '1', total_spent: 1000 },
        { id: '2', country: 'USA', total_spent: 2000 },
      ]

      const grouped = groupCustomersByCountry(customersWithoutCountry as any)

      expect(grouped).toHaveLength(2)
      expect(grouped.find(g => g.country === 'Unknown')?.count).toBe(1)
    })
  })

  describe('filterCustomers', () => {
    const mockCustomers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
        customer_type: 'premium',
        total_spent: 1000,
        country: 'USA',
        segment: 'retail',
        risk_level: 'low',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        status: 'inactive',
        customer_type: 'regular',
        total_spent: 500,
        country: 'Canada',
        segment: 'wholesale',
        risk_level: 'medium',
        created_at: '2024-02-01T00:00:00Z',
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        status: 'active',
        customer_type: 'vip',
        total_spent: 2000,
        country: 'UK',
        segment: 'corporate',
        risk_level: 'high',
        created_at: '2024-03-01T00:00:00Z',
      },
    ]

    it('filters by search query', () => {
      const filtered = filterCustomers(mockCustomers, { query: 'John' })

      expect(filtered).toHaveLength(2) // John Doe and Bob Johnson
      expect(filtered.every(c => c.name.toLowerCase().includes('john'))).toBe(true)
    })

    it('filters by status', () => {
      const filtered = filterCustomers(mockCustomers, { status: 'active' })

      expect(filtered).toHaveLength(2)
      expect(filtered.every(c => c.status === 'active')).toBe(true)
    })

    it('filters by customer type', () => {
      const filtered = filterCustomers(mockCustomers, { customerType: 'premium' })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].customer_type).toBe('premium')
    })

    it('filters by spending range', () => {
      const filtered = filterCustomers(mockCustomers, {
        minSpending: 800,
        maxSpending: 1500
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].total_spent).toBe(1000)
    })

    it('filters by country', () => {
      const filtered = filterCustomers(mockCustomers, { country: 'USA' })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].country).toBe('USA')
    })

    it('filters by segment', () => {
      const filtered = filterCustomers(mockCustomers, { segment: 'retail' })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].segment).toBe('retail')
    })

    it('filters by risk level', () => {
      const filtered = filterCustomers(mockCustomers, { riskLevel: 'low' })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].risk_level).toBe('low')
    })

    it('filters by date range', () => {
      const filtered = filterCustomers(mockCustomers, {
        dateRange: {
          start: '2024-01-15',
          end: '2024-02-15'
        }
      })

      expect(filtered).toHaveLength(2)
      expect(filtered.map(c => c.id).sort()).toEqual(['1', '2'])
    })

    it('combines multiple filters', () => {
      const filtered = filterCustomers(mockCustomers, {
        query: 'John',
        status: 'active',
        minSpending: 500,
        country: 'USA'
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('handles empty filter object', () => {
      const filtered = filterCustomers(mockCustomers, {})

      expect(filtered).toHaveLength(3)
      expect(filtered).toEqual(mockCustomers)
    })

    it('handles empty customer array', () => {
      const filtered = filterCustomers([], { status: 'active' })

      expect(filtered).toHaveLength(0)
    })
  })

  describe('sortCustomers', () => {
    const mockCustomers = [
      {
        id: '1',
        name: 'Alice',
        total_spent: 1000,
        created_at: '2024-01-01T00:00:00Z',
        last_order_date: '2024-03-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Bob',
        total_spent: 2000,
        created_at: '2024-02-01T00:00:00Z',
        last_order_date: '2024-01-01T00:00:00Z',
      },
      {
        id: '3',
        name: 'Charlie',
        total_spent: 1500,
        created_at: '2024-03-01T00:00:00Z',
        last_order_date: '2024-02-01T00:00:00Z',
      },
    ]

    it('sorts by name ascending', () => {
      const sorted = sortCustomers(mockCustomers as any, 'name', 'asc')

      expect(sorted.map(c => c.name)).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('sorts by name descending', () => {
      const sorted = sortCustomers(mockCustomers as any, 'name', 'desc')

      expect(sorted.map(c => c.name)).toEqual(['Charlie', 'Bob', 'Alice'])
    })

    it('sorts by total_spent ascending', () => {
      const sorted = sortCustomers(mockCustomers as any, 'total_spent', 'asc')

      expect(sorted.map(c => c.total_spent)).toEqual([1000, 1500, 2000])
    })

    it('sorts by total_spent descending', () => {
      const sorted = sortCustomers(mockCustomers as any, 'total_spent', 'desc')

      expect(sorted.map(c => c.total_spent)).toEqual([2000, 1500, 1000])
    })

    it('sorts by created_at ascending', () => {
      const sorted = sortCustomers(mockCustomers as any, 'created_at', 'asc')

      expect(sorted.map(c => c.id)).toEqual(['1', '2', '3'])
    })

    it('sorts by created_at descending', () => {
      const sorted = sortCustomers(mockCustomers as any, 'created_at', 'desc')

      expect(sorted.map(c => c.id)).toEqual(['3', '2', '1'])
    })

    it('sorts by last_order_date', () => {
      const sorted = sortCustomers(mockCustomers as any, 'last_order_date', 'desc')

      expect(sorted.map(c => c.id)).toEqual(['1', '3', '2'])
    })

    it('handles unknown sort fields', () => {
      const sorted = sortCustomers(mockCustomers as any, 'unknown_field' as any, 'asc')

      expect(sorted).toEqual(mockCustomers) // Should return original array
    })

    it('handles empty customer array', () => {
      const sorted = sortCustomers([], 'name', 'asc')

      expect(sorted).toHaveLength(0)
    })

    it('handles missing sort values', () => {
      const customersWithMissingData = [
        { id: '1', name: 'Alice' },
        { id: '2', name: null },
        { id: '3', name: 'Charlie' },
      ]

      const sorted = sortCustomers(customersWithMissingData as any, 'name', 'asc')

      expect(sorted.map(c => c.id)).toEqual(['1', '3', '2'])
    })
  })
})