import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductsHeader } from '../../components/ProductsHeader';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}));

// Mock dynamic imports
vi.mock('@/components/products/ProductExport', () => ({
  default: () => <div>ProductExport</div>
}));

describe('ProductsHeader', () => {
  const mockConfig = {
    branding: { logo: 'https://example.com/logo.png' },
    businessName: 'Test Business',
    tagline: 'Test Tagline'
  };

  const mockProps = {
    config: mockConfig,
    canExportProduct: true,
    searchResults: [],
    categories: [],
    onRefresh: vi.fn()
  };

  it('should render business name and tagline', () => {
    render(<ProductsHeader {...mockProps} />);
    
    expect(screen.getByText('Test Business')).toBeInTheDocument();
    expect(screen.getByText(/Test Tagline/)).toBeInTheDocument();
  });

  it('should render logo when provided', () => {
    render(<ProductsHeader {...mockProps} />);
    
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('should render default icon when no logo', () => {
    const propsWithoutLogo = {
      ...mockProps,
      config: { businessName: 'Test', tagline: 'Test' }
    };
    
    render(<ProductsHeader {...propsWithoutLogo} />);
    
    // ShoppingCart icon should be rendered
    expect(screen.queryByAltText('Logo')).not.toBeInTheDocument();
  });

  it('should call onRefresh when refresh button clicked', () => {
    render(<ProductsHeader {...mockProps} />);
    
    const refreshButton = screen.getByText('Actualizar');
    fireEvent.click(refreshButton);
    
    expect(mockProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('should render export button when user has permission', () => {
    render(<ProductsHeader {...mockProps} />);
    
    expect(screen.getByText('ProductExport')).toBeInTheDocument();
  });

  it('should not render export button when user lacks permission', () => {
    const propsWithoutExport = {
      ...mockProps,
      canExportProduct: false
    };
    
    render(<ProductsHeader {...propsWithoutExport} />);
    
    expect(screen.queryByText('ProductExport')).not.toBeInTheDocument();
  });

  it('should render all action buttons', () => {
    render(<ProductsHeader {...mockProps} />);
    
    expect(screen.getByText('Importar')).toBeInTheDocument();
    expect(screen.getByText('Actualizar')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Producto')).toBeInTheDocument();
  });
});
