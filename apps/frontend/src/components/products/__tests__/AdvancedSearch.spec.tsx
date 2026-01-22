import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedSearch from '../../products/AdvancedSearch';

const sampleProducts = [
  {
    id: '1',
    name: 'Producto A',
    code: 'A001',
    description: 'Desc A',
    stock: 10,
    minStock: 5,
    price: 100,
    costPrice: 80,
    categoryId: 'cat1',
    category: { id: 'cat1', name: 'Categoría 1' },
    discount_percentage: 0,
    image: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Producto B',
    code: 'B001',
    description: 'Desc B',
    stock: 0,
    minStock: 3,
    price: 50,
    costPrice: 30,
    categoryId: 'cat2',
    category: { id: 'cat2', name: 'Categoría 2' },
    discount_percentage: 10,
    image: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const sampleCategories = [
  { id: 'cat1', name: 'Categoría 1' },
  { id: 'cat2', name: 'Categoría 2' },
];

describe('AdvancedSearch filters emission', () => {
  it('no emite filtros en el render inicial', async () => {
    const onFiltersChange = vi.fn();
    render(
      <AdvancedSearch
        products={sampleProducts as any}
        categories={sampleCategories}
        onFiltersChange={onFiltersChange as any}
      />
    );
    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it('emite filtros al escribir en la búsqueda', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <AdvancedSearch
        products={sampleProducts as any}
        categories={sampleCategories}
        onFiltersChange={onFiltersChange as any}
      />
    );
    const input = screen.getByPlaceholderText(
      'Buscar por nombre, código, descripción o categoría...'
    );
    await user.type(input, 'abc');
    expect(onFiltersChange).toHaveBeenCalled();
    const lastCallArg = onFiltersChange.mock.calls.at(-1)?.[0];
    expect(lastCallArg.searchTerm).toBe('abc');
  });

  it('emite filtros al hacer click en Limpiar', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    render(
      <AdvancedSearch
        products={sampleProducts as any}
        categories={sampleCategories}
        onFiltersChange={onFiltersChange as any}
      />
    );
    const input = screen.getByPlaceholderText(
      'Buscar por nombre, código, descripción o categoría...'
    );
    await user.type(input, 'x');
    const button = screen.getByRole('button', { name: 'Limpiar' });
    await user.click(button);
    const lastCallArg = onFiltersChange.mock.calls.at(-1)?.[0];
    expect(lastCallArg.searchTerm).toBe('');
  });
});