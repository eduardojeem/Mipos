import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProductsCRUD } from '../../hooks/useProductsCRUD';

// Mock dependencies
vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('@/lib/api', () => ({
  inventoryAPI: {
    adjustStock: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('useProductsCRUD', () => {
  const mockUpdateProduct = vi.fn();
  const mockCreateProduct = vi.fn();
  const mockDeleteProduct = vi.fn();
  const mockRefetch = vi.fn();

  const defaultOptions = {
    updateProduct: mockUpdateProduct,
    createProduct: mockCreateProduct,
    deleteProduct: mockDeleteProduct,
    refetch: mockRefetch
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleSaveProduct', () => {
    it('should create new product when editingProduct is null', async () => {
      mockCreateProduct.mockResolvedValue({ id: '1', name: 'Test Product' });
      
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      const productData = {
        name: 'Test Product',
        code: 'TEST-001',
        price: 10000,
        stock: 50
      };

      let success;
      await act(async () => {
        success = await result.current.handleSaveProduct(productData, null);
      });

      expect(success).toBe(true);
      expect(mockCreateProduct).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should update existing product when editingProduct is provided', async () => {
      mockUpdateProduct.mockResolvedValue({ id: '1', name: 'Updated Product' });
      
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      const editingProduct = {
        id: '1',
        stock_quantity: 50
      };

      const productData = {
        name: 'Updated Product',
        code: 'TEST-001',
        price: 15000,
        stock: 50
      };

      let success;
      await act(async () => {
        success = await result.current.handleSaveProduct(productData, editingProduct);
      });

      expect(success).toBe(true);
      expect(mockUpdateProduct).toHaveBeenCalledWith('1', expect.any(Object));
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockCreateProduct.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      const productData = {
        name: 'Test Product',
        code: 'TEST-001',
        price: 10000,
        stock: 50
      };

      let success;
      await act(async () => {
        success = await result.current.handleSaveProduct(productData, null);
      });

      expect(success).toBe(false);
      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      mockCreateProduct
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ id: '1', name: 'Test Product' });
      
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      const productData = {
        name: 'Test Product',
        code: 'TEST-001',
        price: 10000,
        stock: 50
      };

      let success;
      await act(async () => {
        success = await result.current.handleSaveProduct(productData, null);
      });

      expect(success).toBe(true);
      expect(mockCreateProduct).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleDeleteProduct', () => {
    it('should delete product successfully', async () => {
      mockDeleteProduct.mockResolvedValue(true);
      
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      let success;
      await act(async () => {
        success = await result.current.handleDeleteProduct('1', 'Test Product');
      });

      expect(success).toBe(true);
      expect(mockDeleteProduct).toHaveBeenCalledWith('1');
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      mockDeleteProduct.mockRejectedValue(new Error('Delete failed'));
      
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      let success;
      await act(async () => {
        success = await result.current.handleDeleteProduct('1', 'Test Product');
      });

      expect(success).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return descriptive message for duplicate error', () => {
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      const error = new Error('duplicate key value violates unique constraint');
      const message = result.current.getErrorMessage(error, 'crear');
      
      expect(message).toContain('Ya existe un producto con ese código SKU');
    });

    it('should return descriptive message for network error', () => {
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      const error = new Error('NetworkError: Failed to fetch');
      const message = result.current.getErrorMessage(error, 'cargar');
      
      expect(message).toContain('Error de conexión');
    });

    it('should return descriptive message for permission error', () => {
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      const error = new Error('403 Forbidden');
      const message = result.current.getErrorMessage(error, 'actualizar');
      
      expect(message).toContain('No tienes permisos');
    });

    it('should return generic message for unknown error', () => {
      const { result } = renderHook(() => useProductsCRUD(defaultOptions));
      
      const error = new Error('Unknown error');
      const message = result.current.getErrorMessage(error, 'operación');
      
      expect(message).toContain('Error');
    });
  });
});
