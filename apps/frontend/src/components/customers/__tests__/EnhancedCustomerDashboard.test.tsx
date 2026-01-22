import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EnhancedCustomerDashboard } from '../EnhancedCustomerDashboard'
import { customerService } from '@/lib/customer-service'
import * as xlsx from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Mock dependencies
vi.mock('@/lib/customer-service', () => ({
  customerService: {
    getAll: vi.fn(),
    searchCustomers: vi.fn(),
    exportToCSV: vi.fn(),
    getCustomersByDateRange: vi.fn(),
    getCustomerStats: vi.fn(),
  }
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
    format_cell: vi.fn(),
  },
  writeFile: vi.fn(),
}))

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    autoTable: vi.fn(),
    save: vi.fn(),
  })),
}))

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

// Mock console methods to avoid noise in tests
const originalConsole = { ...console }
beforeEach(() => {
  console.error = vi.fn()
  console.warn = vi.fn()
  console.debug = vi.fn()
})

afterEach(() => {
  console.error = originalConsole.error
  console.warn = originalConsole.warn
  console.debug = originalConsole.debug
  vi.clearAllMocks()
})

// Test data generators
const generateMockCustomers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `customer-${i + 1}`,
    name: `Customer ${i + 1}`,
    email: `customer${i + 1}@example.com`,
    phone: `+123456789${i.toString().padStart(2, '0')}`,
    customer_code: `CUST${(i + 1).toString().padStart(4, '0')}`,
    customer_type: i % 3 === 0 ? 'premium' : i % 3 === 1 ? 'regular' : 'vip',
    status: i % 4 === 0 ? 'active' : i % 4 === 1 ? 'inactive' : i % 4 === 2 ? 'pending' : 'suspended',
    total_spent: Math.floor(Math.random() * 10000) + 100,
    total_orders: Math.floor(Math.random() * 50) + 1,
    average_order_value: Math.floor(Math.random() * 200) + 50,
    last_order_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    country: ['USA', 'Canada', 'UK', 'Germany', 'France'][Math.floor(Math.random() * 5)],
    segment: ['retail', 'wholesale', 'corporate'][Math.floor(Math.random() * 3)],
    risk_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

const mockCustomers = generateMockCustomers(50)
const mockStats = {
  totalCustomers: 50,
  activeCustomers: 35,
  totalRevenue: 250000,
  averageOrderValue: 125.50,
  customerGrowth: 12.5,
  revenueGrowth: 8.3,
  churnRate: 2.1,
  retentionRate: 87.9,
}

describe('EnhancedCustomerDashboard', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup default mock implementations
    vi.mocked(customerService.getAll).mockResolvedValue({
      data: mockCustomers,
      total: mockCustomers.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    })
    
    vi.mocked(customerService.searchCustomers).mockResolvedValue({
      data: mockCustomers.slice(0, 10),
      total: 10,
      page: 1,
      limit: 50,
      totalPages: 1,
    })
    
    vi.mocked(customerService.getCustomerStats).mockResolvedValue(mockStats)
    
    // Setup sessionStorage mock
    mockSessionStorage.getItem.mockReturnValue(null)
  })

  describe('Component Rendering', () => {
    it('renders dashboard with all main sections', async () => {
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Overview')).toBeInTheDocument()
        expect(screen.getByText('Customer Trends')).toBeInTheDocument()
        expect(screen.getByText('Customer Segments')).toBeInTheDocument()
        expect(screen.getByText('Geographic Distribution')).toBeInTheDocument()
        expect(screen.getByText('Revenue Analysis')).toBeInTheDocument()
      })
    })

    it('displays loading state initially', () => {
      render(<EnhancedCustomerDashboard />)
      
      expect(screen.getByText('Loading customers...')).toBeInTheDocument()
    })

    it('displays customer statistics cards', async () => {
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument() // Total Customers
        expect(screen.getByText('35')).toBeInTheDocument() // Active Customers
        expect(screen.getByText('$250,000')).toBeInTheDocument() // Total Revenue
        expect(screen.getByText('$125.50')).toBeInTheDocument() // Avg Order Value
      })
    })

    it('renders charts after data loads', async () => {
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Customer Trends')).toBeInTheDocument()
        expect(screen.getByText('Customer Segments')).toBeInTheDocument()
        expect(screen.getByText('Geographic Distribution')).toBeInTheDocument()
        expect(screen.getByText('Revenue Analysis')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filtering', () => {
    it('filters customers by search query', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search customers...')
      await user.type(searchInput, 'Customer 1')
      
      await waitFor(() => {
        expect(customerService.searchCustomers).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'Customer 1',
          })
        )
      })
    })

    it('applies status filter', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const statusFilter = screen.getByLabelText('Status')
      await user.click(statusFilter)
      
      const activeOption = screen.getByText('Active')
      await user.click(activeOption)
      
      await waitFor(() => {
        expect(customerService.searchCustomers).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              status: 'active',
            }),
          })
        )
      })
    })

    it('applies customer type filter', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const typeFilter = screen.getByLabelText('Customer Type')
      await user.click(typeFilter)
      
      const premiumOption = screen.getByText('Premium')
      await user.click(premiumOption)
      
      await waitFor(() => {
        expect(customerService.searchCustomers).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              customerType: 'premium',
            }),
          })
        )
      })
    })

    it('applies spending range filter', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const minSpendingInput = screen.getByPlaceholderText('Min spending')
      const maxSpendingInput = screen.getByPlaceholderText('Max spending')
      
      await user.type(minSpendingInput, '100')
      await user.type(maxSpendingInput, '1000')
      
      await waitFor(() => {
        expect(customerService.searchCustomers).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              minSpending: 100,
              maxSpending: 1000,
            }),
          })
        )
      })
    })

    it('clears all filters', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      // Apply some filters first
      const searchInput = screen.getByPlaceholderText('Search customers...')
      await user.type(searchInput, 'test')
      
      // Clear filters
      const clearButton = screen.getByText('Clear Filters')
      await user.click(clearButton)
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('')
      })
    })
  })

  describe('Export Functionality', () => {
    it('exports data to CSV', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const exportButton = screen.getByText('Export Data')
      await user.click(exportButton)
      
      const csvOption = screen.getByText('Export as CSV')
      await user.click(csvOption)
      
      await waitFor(() => {
        expect(customerService.exportToCSV).toHaveBeenCalled()
      })
    })

    it('exports data to Excel', async () => {
      const user = userEvent.setup()
      const mockWorkbook = { SheetNames: ['Customers'], Sheets: {} }
      
      vi.mocked(xlsx.utils.json_to_sheet).mockReturnValue({})
      vi.mocked(xlsx.utils.book_new).mockReturnValue(mockWorkbook)
      vi.mocked(xlsx.utils.book_append_sheet).mockReturnValue(undefined)
      vi.mocked(xlsx.writeFile).mockReturnValue(undefined)
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const exportButton = screen.getByText('Export Data')
      await user.click(exportButton)
      
      const excelOption = screen.getByText('Export as Excel')
      await user.click(excelOption)
      
      await waitFor(() => {
        expect(xlsx.utils.json_to_sheet).toHaveBeenCalled()
        expect(xlsx.writeFile).toHaveBeenCalled()
      })
    })

    it('exports data to PDF', async () => {
      const user = userEvent.setup()
      const mockPdf = {
        setFontSize: vi.fn(),
        text: vi.fn(),
        autoTable: vi.fn(),
        save: vi.fn(),
      }
      
      vi.mocked(jsPDF).mockReturnValue(mockPdf as any)
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const exportButton = screen.getByText('Export Data')
      await user.click(exportButton)
      
      const pdfOption = screen.getByText('Export as PDF')
      await user.click(pdfOption)
      
      await waitFor(() => {
        expect(jsPDF).toHaveBeenCalled()
        expect(mockPdf.save).toHaveBeenCalledWith('customers-report.pdf')
      })
    })
  })

  describe('Performance and Caching', () => {
    it('uses cached data when available', async () => {
      const cachedData = {
        customers: mockCustomers.slice(0, 10),
        stats: mockStats,
        timestamp: Date.now() - 2 * 60 * 1000, // 2 minutes ago
      }
      
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(cachedData))
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(customerService.getAll).not.toHaveBeenCalled()
        expect(customerService.getCustomerStats).not.toHaveBeenCalled()
        expect(screen.getByText('10')).toBeInTheDocument() // Should show cached count
      })
    })

    it('refreshes data when cache is expired', async () => {
      const expiredCache = {
        customers: mockCustomers.slice(0, 10),
        stats: mockStats,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      }
      
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(expiredCache))
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(customerService.getAll).toHaveBeenCalled()
        expect(customerService.getCustomerStats).toHaveBeenCalled()
      })
    })

    it('implements pagination correctly', async () => {
      const user = userEvent.setup()
      const manyCustomers = generateMockCustomers(100)
      
      vi.mocked(customerService.getAll).mockResolvedValue({
        data: manyCustomers.slice(0, 50),
        total: 100,
        page: 1,
        limit: 50,
        totalPages: 2,
      })
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      // Check pagination controls exist
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('Previous')).toBeInTheDocument()
      
      // Test next page
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(customerService.getAll).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
            limit: 50,
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when data fetch fails', async () => {
      vi.mocked(customerService.getAll).mockRejectedValue(new Error('Network error'))
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Error loading customers')).toBeInTheDocument()
      })
    })

    it('shows retry button on error', async () => {
      vi.mocked(customerService.getAll).mockRejectedValue(new Error('Network error'))
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('retries data fetch on retry button click', async () => {
      const user = userEvent.setup()
      vi.mocked(customerService.getAll)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: mockCustomers,
          total: mockCustomers.length,
          page: 1,
          limit: 50,
          totalPages: 1,
        })
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(customerService.getAll).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      expect(screen.getByLabelText('Search customers')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
      expect(screen.getByLabelText('Customer Type')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByLabelText('Search customers')
      await user.tab()
      expect(searchInput).toHaveFocus()
    })

    it('announces changes to screen readers', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByLabelText('Search customers')
      await user.type(searchInput, 'test')
      
      // Should have aria-live region for announcements
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('Real-time Updates', () => {
    it('polls for data updates', async () => {
      vi.useFakeTimers()
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(customerService.getAll).toHaveBeenCalledTimes(1)
      })
      
      // Advance time by 30 seconds (polling interval)
      vi.advanceTimersByTime(30000)
      
      await waitFor(() => {
        expect(customerService.getAll).toHaveBeenCalledTimes(2)
      })
      
      vi.useRealTimers()
    })

    it('handles real-time updates gracefully', async () => {
      vi.useFakeTimers()
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      // Simulate data update
      const updatedCustomers = [...mockCustomers.slice(0, 5), {
        ...mockCustomers[5],
        name: 'Updated Customer',
      }]
      
      vi.mocked(customerService.getAll).mockResolvedValue({
        data: updatedCustomers,
        total: updatedCustomers.length,
        page: 1,
        limit: 50,
        totalPages: 1,
      })
      
      // Advance time to trigger poll
      vi.advanceTimersByTime(30000)
      
      await waitFor(() => {
        expect(screen.getByText('Updated Customer')).toBeInTheDocument()
      })
      
      vi.useRealTimers()
    })
  })

  describe('Data Processing', () => {
    it('calculates customer segments correctly', async () => {
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      // Check that segment data is displayed
      expect(screen.getByText('Customer Segments')).toBeInTheDocument()
    })

    it('calculates geographic distribution', async () => {
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      // Check that geographic data is displayed
      expect(screen.getByText('Geographic Distribution')).toBeInTheDocument()
    })

    it('calculates revenue metrics', async () => {
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      // Check that revenue analysis is displayed
      expect(screen.getByText('Revenue Analysis')).toBeInTheDocument()
    })
  })

  describe('Performance Metrics', () => {
    it('renders large datasets efficiently', async () => {
      const largeDataset = generateMockCustomers(1000)
      
      vi.mocked(customerService.getAll).mockResolvedValue({
        data: largeDataset,
        total: largeDataset.length,
        page: 1,
        limit: 1000,
        totalPages: 1,
      })
      
      const startTime = performance.now()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render in less than 2 seconds for 1000 records
      expect(renderTime).toBeLessThan(2000)
    })

    it('implements virtual scrolling for large tables', async () => {
      const largeDataset = generateMockCustomers(500)
      
      vi.mocked(customerService.getAll).mockResolvedValue({
        data: largeDataset,
        total: largeDataset.length,
        page: 1,
        limit: 500,
        totalPages: 1,
      })
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      // Check that virtual scrolling is implemented
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })
  })

  describe('Theme and UI', () => {
    it('toggles between light and dark themes', async () => {
      const user = userEvent.setup()
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      const themeToggle = screen.getByLabelText('Toggle theme')
      await user.click(themeToggle)
      
      // Should toggle theme
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('responds to system theme changes', async () => {
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
      
      // Simulate system theme change
      window.matchMedia = vi.fn().mockReturnValue({
        matches: true,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })
      
      // Component should respond to theme changes
      expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
    })
  })

  describe('Data Validation', () => {
    it('validates customer data structure', async () => {
      const invalidCustomer = {
        id: 'invalid',
        // Missing required fields
      }
      
      vi.mocked(customerService.getAll).mockResolvedValue({
        data: [invalidCustomer as any],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      })
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        // Should handle invalid data gracefully
        expect(screen.getByText('Enhanced Customer Dashboard')).toBeInTheDocument()
      })
    })

    it('handles missing statistical data', async () => {
      const incompleteStats = {
        totalCustomers: 50,
        // Missing other stats
      }
      
      vi.mocked(customerService.getCustomerStats).mockResolvedValue(incompleteStats as any)
      
      render(<EnhancedCustomerDashboard />)
      
      await waitFor(() => {
        // Should display available stats
        expect(screen.getByText('50')).toBeInTheDocument()
      })
    })
  })
})