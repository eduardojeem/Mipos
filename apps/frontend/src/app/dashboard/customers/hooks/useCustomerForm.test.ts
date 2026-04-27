import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UICustomer } from '@/types/customer-page';
import { useCustomerForm } from './useCustomerForm';

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();

vi.mock('@/hooks/useOptimizedCustomers', () => ({
  useCreateCustomer: () => ({
    mutateAsync: createMutateAsync,
  }),
  useUpdateCustomer: () => ({
    mutateAsync: updateMutateAsync,
  }),
}));

describe('useCustomerForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMutateAsync.mockResolvedValue({ id: 'created-customer' });
    updateMutateAsync.mockResolvedValue({ id: 'existing-customer' });
  });

  it('removes field errors after correcting a valid value', () => {
    const { result } = renderHook(() => useCustomerForm());

    act(() => {
      result.current.updateField('email', 'correo-invalido');
    });

    expect(result.current.errors.email).toBeTruthy();

    act(() => {
      result.current.updateField('email', 'cliente@example.com');
    });

    expect(result.current.errors.email).toBeUndefined();
    expect(Object.keys(result.current.errors)).toHaveLength(0);
  });

  it('submits a new customer once the form is valid', async () => {
    const { result } = renderHook(() => useCustomerForm());

    act(() => {
      result.current.updateField('name', 'Cliente Nuevo');
      result.current.updateField('email', 'cliente@example.com');
      result.current.updateField('phone', '0981234567');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(createMutateAsync).toHaveBeenCalledWith({
      name: 'Cliente Nuevo',
      email: 'cliente@example.com',
      phone: '0981234567',
      address: null,
      ruc: null,
      customerType: 'regular',
      birthDate: null,
      notes: null,
      is_active: true,
    });
    expect(result.current.submitting).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it('uses the update mutation when editing an existing customer', async () => {
    const existingCustomer = {
      id: 'existing-customer',
      name: 'Cliente Existente',
      customer_type: 'RETAIL',
      status: 'active',
      is_active: true,
      customerType: 'regular',
      totalSpent: 1500,
      totalOrders: 4,
      created_at: '2026-01-10T00:00:00.000Z',
      updated_at: '2026-01-10T00:00:00.000Z',
    } as UICustomer;

    const { result } = renderHook(({ customer }) => useCustomerForm(customer), {
      initialProps: { customer: existingCustomer },
    });

    act(() => {
      result.current.updateField('notes', 'Actualizado desde el modal');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'existing-customer',
      data: expect.objectContaining({
        name: 'Cliente Existente',
        notes: 'Actualizado desde el modal',
      }),
    });
  });
});
