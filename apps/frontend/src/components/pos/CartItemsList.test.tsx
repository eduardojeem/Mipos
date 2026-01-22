import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { CartItemsList } from './CartItemsList';

// Hoist mocks so they are available inside vi.mock factory
const { mockToastWarning, mockToastInfo, mockToastSuccess, mockToastError, mockToastShow } = vi.hoisted(() => ({
  mockToastWarning: vi.fn(),
  mockToastInfo: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastShow: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  __esModule: true,
  default: {
    warning: mockToastWarning,
    info: mockToastInfo,
    success: mockToastSuccess,
    error: mockToastError,
    show: mockToastShow,
  },
  toast: {
    warning: mockToastWarning,
    info: mockToastInfo,
    success: mockToastSuccess,
    error: mockToastError,
    show: mockToastShow,
  },
}));

describe('CartItemsList - quantity and stock validation', () => {
  beforeEach(() => {
    mockToastWarning.mockClear();
    mockToastInfo.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mockToastShow.mockClear();
  });

  const baseItem = {
    product_id: 'p1',
    product_name: 'Producto 1',
    price: 10,
    quantity: 1,
    total: 10,
    subtotal_without_iva: 8.26,
    iva_amount: 1.74,
    iva_rate: 21,
    product: {
      stock_quantity: 3,
      low_stock_threshold: 2,
    },
  };

  it('increments up to stock and warns when exceeding', () => {
    const onSetQuantitySpy = vi.fn();

    function TestCart() {
      const [items, setItems] = React.useState([baseItem]);
      const onSetQuantity = (productId: string, quantity: number) => {
        setItems((prev) => prev.map(it => it.product_id === productId ? { ...it, quantity, total: quantity * it.price } : it));
        onSetQuantitySpy(productId, quantity);
      };
      return (
        <CartItemsList
          items={items}
          onRemoveItem={vi.fn()}
          onSetQuantity={onSetQuantity}
        />
      );
    }

    render(<TestCart />);

    const incBtn = screen.getByLabelText('Aumentar cantidad');

    // 1 -> 2
    fireEvent.click(incBtn);
    expect(onSetQuantitySpy).toHaveBeenCalledWith('p1', 2);

    // 2 -> 3
    fireEvent.click(incBtn);
    expect(onSetQuantitySpy).toHaveBeenCalledWith('p1', 3);

    // Try exceed stock (remain 3) and warn
    fireEvent.click(incBtn);
    expect(onSetQuantitySpy).toHaveBeenCalledTimes(2);
    expect(mockToastWarning).toHaveBeenCalled();
  });

  it('direct input beyond stock clamps and warns', () => {
    const onSetQuantity = vi.fn();
    render(
      <CartItemsList
        items={[baseItem]}
        onRemoveItem={vi.fn()}
        onSetQuantity={onSetQuantity}
      />
    );

    const input = screen.getByLabelText('Cantidad');
    fireEvent.change(input, { target: { value: '5' } });

    expect(onSetQuantity).toHaveBeenCalledWith('p1', 3);
    expect(mockToastWarning).toHaveBeenCalled();
  });
});