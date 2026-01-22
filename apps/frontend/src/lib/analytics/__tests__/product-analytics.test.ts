import { describe, it, expect } from 'vitest';
import {
  calculateSalesTrend,
  calculateCategoryDistribution,
  calculateStockLevels,
  getTopProducts,
  calculateMonthlyRevenue,
  calculateProductMetrics
} from '../product-analytics';
import type { Product, Category } from '@/types';

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Product 1',
    sku: 'P001',
    sale_price: 10000,
    cost_price: 5000,
    stock_quantity: 50,
    category_id: 'cat1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Product 2',
    sku: 'P002',
    sale_price: 20000,
    cost_price: 10000,
    stock_quantity: 3,
    category_id: 'cat1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Product 3',
    sku: 'P003',
    sale_price: 15000,
    cost_price: 8000,
    stock_quantity: 15,
    category_id: 'cat2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
] as Product[];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Category 1', description: '' },
  { id: 'cat2', name: 'Category 2', description: '' }
] as Category[];

describe('Product Analytics', () => {
  describe('calculateSalesTrend', () => {
    it('should return 30 days of data', () => {
      const result = calculateSalesTrend(mockProducts);
      expect(result).toHaveLength(30);
    });

    it('should include date, sales, and revenue', () => {
      const result = calculateSalesTrend(mockProducts);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('sales');
      expect(result[0]).toHaveProperty('revenue');
    });

    it('should sort by date ascending', () => {
      const result = calculateSalesTrend(mockProducts);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true);
      }
    });
  });

  describe('calculateCategoryDistribution', () => {
    it('should calculate distribution correctly', () => {
      const result = calculateCategoryDistribution(mockProducts, mockCategories);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Category 1');
      expect(result[0].value).toBe(2);
      expect(result[0].percentage).toBe(67);
    });

    it('should return empty array for no products', () => {
      const result = calculateCategoryDistribution([], mockCategories);
      expect(result).toEqual([]);
    });

    it('should sort by value descending', () => {
      const result = calculateCategoryDistribution(mockProducts, mockCategories);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].value <= result[i - 1].value).toBe(true);
      }
    });
  });

  describe('calculateStockLevels', () => {
    it('should categorize stock levels correctly', () => {
      const result = calculateStockLevels(mockProducts);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(level => level.count > 0)).toBe(true);
    });

    it('should calculate percentages correctly', () => {
      const result = calculateStockLevels(mockProducts);
      const totalPercentage = result.reduce((sum, level) => sum + level.percentage, 0);
      
      expect(totalPercentage).toBeGreaterThanOrEqual(99);
      expect(totalPercentage).toBeLessThanOrEqual(101);
    });

    it('should use custom thresholds', () => {
      const result = calculateStockLevels(mockProducts, {
        critical: 10,
        low: 30,
        high: 100
      });
      
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getTopProducts', () => {
    it('should return top products by revenue', () => {
      const result = getTopProducts(mockProducts, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0].revenue >= result[1].revenue).toBe(true);
    });

    it('should calculate revenue correctly', () => {
      const result = getTopProducts(mockProducts);
      
      expect(result[0].revenue).toBe(10000 * 50); // Product 1
    });

    it('should respect limit parameter', () => {
      const result = getTopProducts(mockProducts, 1);
      expect(result).toHaveLength(1);
    });
  });

  describe('calculateMonthlyRevenue', () => {
    it('should return 12 months of data', () => {
      const result = calculateMonthlyRevenue(mockProducts);
      expect(result).toHaveLength(12);
    });

    it('should include month, revenue, profit, and growth', () => {
      const result = calculateMonthlyRevenue(mockProducts);
      
      expect(result[0]).toHaveProperty('month');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0]).toHaveProperty('profit');
      expect(result[0]).toHaveProperty('growth');
    });

    it('should calculate profit correctly', () => {
      const result = calculateMonthlyRevenue(mockProducts);
      const currentMonth = result[result.length - 1];
      
      expect(currentMonth.profit).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateProductMetrics', () => {
    it('should calculate average price', () => {
      const result = calculateProductMetrics(mockProducts);
      const expectedAvg = (10000 + 20000 + 15000) / 3;
      
      expect(result.averagePrice).toBe(Math.round(expectedAvg));
    });

    it('should calculate average stock', () => {
      const result = calculateProductMetrics(mockProducts);
      const expectedAvg = (50 + 3 + 15) / 3;
      
      expect(result.averageStock).toBe(Math.round(expectedAvg));
    });

    it('should calculate total value', () => {
      const result = calculateProductMetrics(mockProducts);
      const expectedValue = (10000 * 50) + (20000 * 3) + (15000 * 15);
      
      expect(result.totalValue).toBe(expectedValue);
    });

    it('should calculate profit margin', () => {
      const result = calculateProductMetrics(mockProducts);
      
      expect(result.profitMargin).toBeGreaterThan(0);
      expect(result.profitMargin).toBeLessThanOrEqual(100);
    });

    it('should handle empty products array', () => {
      const result = calculateProductMetrics([]);
      
      expect(result.averagePrice).toBe(0);
      expect(result.averageStock).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.profitMargin).toBe(0);
    });
  });
});
