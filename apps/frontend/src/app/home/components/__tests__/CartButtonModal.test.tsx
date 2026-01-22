import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useCatalogCart', () => ({
  useCatalogCart: () => ({
    cart: [
      { product: { id: '1', name: 'Producto A', sale_price: 10, offer_price: 8, image_url: '/api/placeholder/64/64', stock_quantity: 10 }, quantity: 2 },
      { product: { id: '2', name: 'Producto B', sale_price: 5, image_url: '/api/placeholder/64/64', stock_quantity: 5 }, quantity: 1 },
    ],
    cartTotal: 8 * 2 + 5,
    cartItemsCount: 3,
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  })
}));

vi.mock('@/contexts/BusinessConfigContext', () => ({
  useBusinessConfig: () => ({ config: { currency: 'USD', businessName: 'Test' } }),
  useCurrencyFormatter: () => (n: number) => `$${n.toFixed(2)}`,
}));

import { CartButton } from '../CartButton';

describe('CartButton modal', () => {
  it('abre y cierra el modal al hacer clic', async () => {
    render(<CartButton />);

    const trigger = screen.getByRole('button', { name: /carrito/i });
    fireEvent.click(trigger);

    expect(await screen.findByText(/ver carrito/i)).toBeVisible();
    expect(screen.getByText(/proceder al pago/i)).toBeVisible();

    const continuarBtn = screen.getByRole('button', { name: /continuar comprando/i });
    fireEvent.click(continuarBtn);

    // Al cerrar, el título ya no debería estar en el documento
    expect(screen.queryByText(/ver carrito/i)).toBeNull();
  });

  it('muestra productos y calcula total correctamente', async () => {
    render(<CartButton />);
    fireEvent.click(screen.getByRole('button', { name: /carrito/i }));

    // Productos renderizados
    expect(await screen.findByText('Producto A')).toBeVisible();
    expect(screen.getByText('Producto B')).toBeVisible();

    // Precio unitario usa offer_price cuando existe
    expect(screen.getAllByText('$8.00')[0]).toBeVisible();

    // Total
    expect(screen.getAllByText('$21.00')[0]).toBeVisible();
  });
});

