import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PublicSearchBar from '../PublicSearchBar';

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({ push: vi.fn() })
  };
});

vi.mock('@/hooks/use-global-search', async (orig) => {
  const mod: any = await (orig as any)();
  return {
    ...mod,
    useGlobalSearch: (q: string) => ({
      results: q.length >= 2 ? [
        { id: 'p1', type: 'product', title: 'Producto 1', href: '/catalog/p1' }
      ] : [],
      groupedResults: q.length >= 2 ? { product: [{ id: 'p1', type: 'product', title: 'Producto 1', href: '/catalog/p1' }] } : { product: [] },
      isLoading: false,
      isEmpty: q.length >= 2 ? false : true
    })
  };
});

describe('PublicSearchBar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renderiza input con placeholder', () => {
    render(<PublicSearchBar />);
    expect(screen.getByPlaceholderText('Buscar productos y categorías')).toBeInTheDocument();
  });

  it('muestra historial reciente cuando no hay query', () => {
    localStorage.setItem('public-search-history', JSON.stringify(['teclado', 'mouse']));
    render(<PublicSearchBar />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByText('Recientes')).toBeInTheDocument();
    expect(screen.getByText('teclado')).toBeInTheDocument();
    expect(screen.getByText('mouse')).toBeInTheDocument();
  });

  it('navega al catálogo al enviar búsqueda', () => {
    const push = vi.fn();
    vi.mocked(require('next/navigation').useRouter).mockReturnValue({ push } as any);
    render(<PublicSearchBar />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'laptop' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/catalog?search=laptop');
  });
});

