import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => {
  return {
    useParams: () => ({ id: 'prod-123' }),
    useRouter: () => ({ push: vi.fn(), back: vi.fn() })
  }
})

vi.mock('@/services/productService', () => {
  return {
    default: {
      getProductById: vi.fn(async () => ({
        id: 'prod-123',
        name: 'Base Matte',
        sku: 'BM-001',
        description: 'Cobertura media',
        category_id: 'cat-1',
        sale_price: 25,
        cost_price: 10,
        wholesale_price: 20,
        stock_quantity: 50,
        min_stock: 5,
        image_url: 'https://img.test/p.png',
      })),
      getCategories: vi.fn(async () => ([{ id: 'cat-1', name: 'Maquillaje' }])),
      updateProduct: vi.fn(async () => ({ id: 'prod-123' })),
    }
  }
})

// Lazy import after mocks
import Page from '../page'

describe('Editar Producto Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza ProductForm en modo edición y precarga valores', async () => {
    render(React.createElement(Page))

    await waitFor(() => {
      expect(screen.getByText('Editar Producto')).toBeDefined()
    })

    expect(screen.getByText('Maquillaje')).toBeDefined()
  })
})