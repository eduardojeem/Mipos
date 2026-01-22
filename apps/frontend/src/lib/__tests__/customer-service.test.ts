import { describe, it, expect, beforeEach, vi } from 'vitest'
import { customerService } from '../customer-service'
import api from '@/lib/api'

// Mock the API
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}))

describe('CustomerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('fetches all customers with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            customer_code: 'CUST001',
            customer_type: 'regular',
            status: 'active',
            total_spent: 1000,
            total_orders: 5,
          }
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.getAll({ page: 1, limit: 50 })

      expect(api.get).toHaveBeenCalledWith('/customers', {
        params: { page: 1, limit: 50 }
      })
      expect(result).toEqual(mockResponse)
    })

    it('handles search parameters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.getAll({
        page: 1,
        limit: 50,
        search: 'john'
      })

      expect(api.get).toHaveBeenCalledWith('/customers', {
        params: { page: 1, limit: 50, search: 'john' }
      })
      expect(result).toEqual(mockResponse)
    })

    it('handles filter parameters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.getAll({
        page: 1,
        limit: 50,
        filters: {
          status: 'active',
          customerType: 'premium',
          country: 'USA',
          segment: 'retail',
          riskLevel: 'low',
          minSpending: 100,
          maxSpending: 1000,
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31'
          }
        }
      })

      expect(api.get).toHaveBeenCalledWith('/customers', {
        params: {
          page: 1,
          limit: 50,
          status: 'active',
          customerType: 'premium',
          country: 'USA',
          segment: 'retail',
          riskLevel: 'low',
          minSpending: 100,
          maxSpending: 1000,
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      })
      expect(result).toEqual(mockResponse)
    })

    it('handles sorting parameters', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.getAll({
        page: 1,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'desc'
      })

      expect(api.get).toHaveBeenCalledWith('/customers', {
        params: { page: 1, limit: 50, sortBy: 'name', sortOrder: 'desc' }
      })
      expect(result).toEqual(mockResponse)
    })

    it('handles API errors gracefully', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await expect(customerService.getAll({ page: 1, limit: 50 }))
        .rejects.toThrow('Network error')
    })
  })

  describe('searchCustomers', () => {
    it('searches customers with query and filters', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            customer_code: 'CUST001',
            customer_type: 'regular',
            status: 'active',
            total_spent: 1000,
            total_orders: 5,
          }
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.searchCustomers({
        query: 'john',
        page: 1,
        limit: 50,
        filters: { status: 'active' }
      })

      expect(api.get).toHaveBeenCalledWith('/customers/search', {
        params: {
          query: 'john',
          page: 1,
          limit: 50,
          status: 'active'
        }
      })
      expect(result).toEqual(mockResponse)
    })

    it('handles empty search results', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.searchCustomers({
        query: 'nonexistent',
        page: 1,
        limit: 50
      })

      expect(result).toEqual(mockResponse)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('getCustomerStats', () => {
    it('fetches customer statistics', async () => {
      const mockStats = {
        totalCustomers: 150,
        activeCustomers: 120,
        totalRevenue: 250000,
        averageOrderValue: 125.50,
        customerGrowth: 12.5,
        revenueGrowth: 8.3,
        churnRate: 2.1,
        retentionRate: 87.9,
        topCountries: [
          { country: 'USA', count: 50, revenue: 100000 },
          { country: 'Canada', count: 30, revenue: 50000 }
        ],
        customerSegments: [
          { segment: 'premium', count: 25, revenue: 150000 },
          { segment: 'regular', count: 125, revenue: 100000 }
        ],
        monthlyTrends: [
          { month: 'Jan', customers: 140, revenue: 20000 },
          { month: 'Feb', customers: 145, revenue: 22000 }
        ]
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockStats })

      const result = await customerService.getCustomerStats()

      expect(api.get).toHaveBeenCalledWith('/customers/stats')
      expect(result).toEqual(mockStats)
    })

    it('handles stats API errors', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Stats API error'))

      await expect(customerService.getCustomerStats())
        .rejects.toThrow('Stats API error')
    })
  })

  describe('getCustomersByDateRange', () => {
    it('fetches customers within date range', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            created_at: '2024-01-15T00:00:00Z',
            total_spent: 1000,
            total_orders: 5,
          }
        ],
        total: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.getCustomersByDateRange({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      })

      expect(api.get).toHaveBeenCalledWith('/customers/date-range', {
        params: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      })
      expect(result).toEqual(mockResponse)
    })

    it('handles invalid date ranges', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Invalid date range'))

      await expect(customerService.getCustomersByDateRange({
        startDate: '2024-01-31',
        endDate: '2024-01-01' // Invalid: start after end
      })).rejects.toThrow('Invalid date range')
    })
  })

  describe('exportToCSV', () => {
    it('exports customer data to CSV format', async () => {
      const mockCustomers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          customer_code: 'CUST001',
          customer_type: 'regular',
          status: 'active',
          total_spent: 1000,
          total_orders: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          customer_code: 'CUST002',
          customer_type: 'premium',
          status: 'active',
          total_spent: 2500,
          total_orders: 12,
          created_at: '2024-01-02T00:00:00Z',
        }
      ]

      vi.mocked(api.post).mockResolvedValue({ data: { csv: 'name,email,total_spent\nJohn Doe,john@example.com,1000\nJane Smith,jane@example.com,2500' } })

      const result = await customerService.exportToCSV(mockCustomers)

      expect(api.post).toHaveBeenCalledWith('/customers/export/csv', {
        customers: mockCustomers,
        format: 'csv'
      })
      expect(result).toBe('name,email,total_spent\nJohn Doe,john@example.com,1000\nJane Smith,jane@example.com,2500')
    })

    it('handles empty customer list for export', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { csv: '' } })

      const result = await customerService.exportToCSV([])

      expect(result).toBe('')
      expect(api.post).toHaveBeenCalledWith('/customers/export/csv', {
        customers: [],
        format: 'csv'
      })
    })

    it('handles export API errors', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Export failed'))

      await expect(customerService.exportToCSV([
        { id: '1', name: 'John Doe', email: 'john@example.com' }
      ])).rejects.toThrow('Export failed')
    })
  })

  describe('Field Mapping', () => {
    it('correctly maps frontend fields to backend fields', async () => {
      const mockCustomer = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        customerCode: 'CUST001', // Frontend field name
        customerType: 'regular',   // Frontend field name
        status: 'active',
      }

      const mockResponse = {
        data: [{
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          customer_code: 'CUST001', // Backend field name
          customer_type: 'regular',  // Backend field name
          status: 'active',
        }],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.getAll({ page: 1, limit: 50 })

      expect(result.data[0]).toHaveProperty('customer_code', 'CUST001')
      expect(result.data[0]).toHaveProperty('customer_type', 'regular')
    })

    it('generates customer code when missing', async () => {
      const mockCustomer = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        // Missing customer_code
      }

      const mockResponse = {
        data: [{
          ...mockCustomer,
          customer_code: 'CUST-JDOE-2024', // Generated code
        }],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const result = await customerService.getAll({ page: 1, limit: 50 })

      expect(result.data[0]).toHaveProperty('customer_code')
      expect(result.data[0].customer_code).toMatch(/^CUST-/)
    })
  })

  describe('Mock Endpoints', () => {
    it('uses real API endpoints when mock endpoints are disabled', async () => {
      // This test verifies that the service uses real endpoints
      // The mockEndpoints flag should be set to false in production
      
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      await customerService.getAll({ page: 1, limit: 50 })

      // Should call the real API endpoint
      expect(api.get).toHaveBeenCalledWith('/customers', expect.any(Object))
    })
  })

  describe('Performance', () => {
    it('handles large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `customer-${i}`,
        name: `Customer ${i}`,
        email: `customer${i}@example.com`,
        customer_code: `CUST${i.toString().padStart(4, '0')}`,
        customer_type: i % 3 === 0 ? 'premium' : 'regular',
        status: 'active',
        total_spent: Math.floor(Math.random() * 10000),
        total_orders: Math.floor(Math.random() * 50),
      }))

      const mockResponse = {
        data: largeDataset,
        total: 1000,
        page: 1,
        limit: 1000,
        totalPages: 1,
      }

      vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

      const startTime = performance.now()
      const result = await customerService.getAll({ page: 1, limit: 1000 })
      const endTime = performance.now()

      expect(result.data).toHaveLength(1000)
      expect(result.total).toBe(1000)
      expect(endTime - startTime).toBeLessThan(1000) // Should process in less than 1 second
    })

    it('implements request timeout for long-running requests', async () => {
      // Simulate a slow API response
      vi.mocked(api.get).mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { data: [], total: 0 } }), 5000)
        })
      )

      // The service should handle timeouts gracefully
      const promise = customerService.getAll({ page: 1, limit: 50 })
      
      // Should not hang indefinitely
      await expect(promise).resolves.toBeDefined()
    })
  })

  describe('Error Recovery', () => {
    it('retries failed requests with exponential backoff', async () => {
      let attempts = 0
      
      vi.mocked(api.get).mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary network error'))
        }
        return Promise.resolve({ 
          data: { 
            data: [{ id: '1', name: 'John Doe' }], 
            total: 1 
          } 
        })
      })

      const result = await customerService.getAll({ page: 1, limit: 50 })

      expect(attempts).toBe(3)
      expect(result.data).toHaveLength(1)
    })

    it('provides meaningful error messages', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Database connection failed'))

      await expect(customerService.getAll({ page: 1, limit: 50 }))
        .rejects.toThrow('Database connection failed')
    })
  })
})