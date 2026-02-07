import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiscountsStep } from '../DiscountsStep';

// Mock currency formatter
vi.mock('@/contexts/BusinessConfigContext', () => ({
  useCurrencyFormatter: () => (value: number) => `$${value.toFixed(2)}`,
}));

describe('DiscountsStep', () => {
  const defaultProps = {
    discount: 0,
    discountType: 'PERCENTAGE' as const,
    onDiscountChange: vi.fn(),
    onDiscountTypeChange: vi.fn(),
    couponCode: '',
    onCouponCodeChange: vi.fn(),
    onApplyCoupon: vi.fn(),
    onRemoveCoupon: vi.fn(),
    couponApplied: null,
    couponLoading: false,
    composedDiscountTotal: 0,
    breakdown: [],
  };

  it('renders discount input fields', () => {
    render(<DiscountsStep {...defaultProps} />);
    
    expect(screen.getByText('Descuentos y Cupones')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0-100')).toBeInTheDocument();
  });

  it('calls onDiscountChange when discount value changes', () => {
    render(<DiscountsStep {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('0-100');
    fireEvent.change(input, { target: { value: '10' } });
    
    expect(defaultProps.onDiscountChange).toHaveBeenCalledWith(10);
  });

  it('shows coupon input when no coupon is applied', () => {
    render(<DiscountsStep {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Código del cupón')).toBeInTheDocument();
    expect(screen.getByText('Aplicar')).toBeInTheDocument();
  });

  it('shows applied coupon details when coupon is applied', () => {
    const props = {
      ...defaultProps,
      couponCode: 'SAVE10',
      couponApplied: { amount: 10, type: 'PERCENTAGE' as const },
    };
    
    render(<DiscountsStep {...props} />);
    
    expect(screen.getByText(/Cupón aplicado: SAVE10/)).toBeInTheDocument();
    expect(screen.getByText(/Descuento: 10%/)).toBeInTheDocument();
  });

  it('calls onApplyCoupon when apply button is clicked', async () => {
    const onApplyCoupon = vi.fn().mockResolvedValue(undefined);
    const props = {
      ...defaultProps,
      couponCode: 'TEST123',
      onApplyCoupon,
    };
    
    render(<DiscountsStep {...props} />);
    
    const applyButton = screen.getByText('Aplicar');
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(onApplyCoupon).toHaveBeenCalled();
    });
  });

  it('shows discount summary when discount is applied', () => {
    const props = {
      ...defaultProps,
      composedDiscountTotal: 50,
      breakdown: [30, 20],
    };
    
    render(<DiscountsStep {...props} />);
    
    expect(screen.getByText('Descuento total aplicado')).toBeInTheDocument();
    expect(screen.getByText('-$50.00')).toBeInTheDocument();
  });

  it('disables apply button when coupon code is empty', () => {
    render(<DiscountsStep {...defaultProps} />);
    
    const applyButton = screen.getByText('Aplicar');
    expect(applyButton).toBeDisabled();
  });

  it('shows loading state when validating coupon', () => {
    const props = {
      ...defaultProps,
      couponCode: 'TEST',
      couponLoading: true,
    };
    
    render(<DiscountsStep {...props} />);
    
    expect(screen.getByText('Validando...')).toBeInTheDocument();
  });
});
