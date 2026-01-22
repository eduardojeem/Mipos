import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProductsStats } from '../../components/ProductsStats';

describe('ProductsStats', () => {
  const mockStats = {
    totalProducts: 150,
    lowStockProducts: 10,
    outOfStockProducts: 5,
    totalValue: 1500000,
    recentlyAdded: 8,
    topCategory: 'Maquillaje'
  };

  const mockCategories = [
    { id: '1', name: 'Maquillaje', description: 'Test' },
    { id: '2', name: 'Skincare', description: 'Test' }
  ];

  it('should render all stat cards', () => {
    render(<ProductsStats stats={mockStats} categories={mockCategories} />);
    
    expect(screen.getByText('Total Productos')).toBeInTheDocument();
    expect(screen.getByText('Valor Total')).toBeInTheDocument();
    expect(screen.getByText('Categoría Principal')).toBeInTheDocument();
    expect(screen.getByText('Alertas')).toBeInTheDocument();
  });

  it('should display correct total products', () => {
    render(<ProductsStats stats={mockStats} categories={mockCategories} />);
    
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('+8 esta semana')).toBeInTheDocument();
  });

  it('should format total value correctly', () => {
    render(<ProductsStats stats={mockStats} categories={mockCategories} />);
    
    expect(screen.getByText('Gs 1,500,000')).toBeInTheDocument();
  });

  it('should display top category', () => {
    render(<ProductsStats stats={mockStats} categories={mockCategories} />);
    
    // Should appear twice: once in badge, once in content
    const categoryElements = screen.getAllByText('Maquillaje');
    expect(categoryElements.length).toBeGreaterThan(0);
  });

  it('should calculate and display total alerts', () => {
    render(<ProductsStats stats={mockStats} categories={mockCategories} />);
    
    // 10 low stock + 5 out of stock = 15 total
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Requieren atención')).toBeInTheDocument();
  });

  it('should handle zero stats gracefully', () => {
    const zeroStats = {
      totalProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalValue: 0,
      recentlyAdded: 0,
      topCategory: 'N/A'
    };
    
    render(<ProductsStats stats={zeroStats} categories={mockCategories} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Gs 0')).toBeInTheDocument();
  });
});
