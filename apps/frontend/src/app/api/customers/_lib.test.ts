import { describe, expect, it } from 'vitest';
import { buildCustomerSummary, transformCustomerRecord } from './_lib';

describe('customer api helpers', () => {
  it('builds summary metrics from customer rows in a single pass', () => {
    const summary = buildCustomerSummary(
      [
        {
          customer_type: 'VIP',
          is_active: true,
          total_purchases: 12000,
          total_orders: 12,
          created_at: '2026-04-05T00:00:00.000Z',
        },
        {
          customer_type: 'WHOLESALE',
          is_active: false,
          total_purchases: 8000,
          total_orders: 4,
          created_at: '2026-03-10T00:00:00.000Z',
        },
        {
          customer_type: 'REGULAR',
          is_active: true,
          total_purchases: 100,
          total_orders: 1,
          created_at: '2026-01-10T00:00:00.000Z',
        },
      ],
      new Date('2026-04-12T00:00:00.000Z')
    );

    expect(summary).toMatchObject({
      total: 3,
      active: 2,
      inactive: 1,
      vip: 1,
      wholesale: 1,
      regular: 1,
      newThisMonth: 1,
      totalRevenue: 20100,
      totalOrders: 17,
      avgOrderValue: 1182.35,
      highValue: 1,
      frequent: 1,
      growthRate: 0,
      activeRate: 66.67,
    });
  });

  it('transforms customer records to the UI contract', () => {
    const customer = transformCustomerRecord(
      {
        id: 'customer-1',
        name: 'Cliente VIP',
        email: 'vip@example.com',
        phone: '0981234567',
        address: 'Asuncion',
        tax_id: '123',
        ruc: '80012345-6',
        customer_code: 'CLVIP001',
        customer_type: 'VIP',
        status: 'inactive',
        is_active: false,
        total_purchases: 3500,
        total_orders: 5,
        last_purchase: '2026-04-01T00:00:00.000Z',
        birth_date: '1990-01-15',
        notes: 'Observacion',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-04-10T00:00:00.000Z',
      },
      {
        purchaseHistory: [
          {
            id: 'sale-1',
            total: 500,
            created_at: '2026-04-01T00:00:00.000Z',
            status: 'completed',
            sale_items: [
              {
                quantity: 2,
                unit_price: 250,
                products: {
                  id: 'product-1',
                  name: 'Producto 1',
                },
              },
            ],
          },
        ],
      }
    );

    expect(customer).toMatchObject({
      id: 'customer-1',
      customerCode: 'CLVIP001',
      customerType: 'vip',
      totalSpent: 3500,
      totalOrders: 5,
      lastPurchase: '2026-04-01T00:00:00.000Z',
      birthDate: '1990-01-15',
      status: 'inactive',
      is_active: false,
      purchaseHistory: [
        {
          orderNumber: '#SALE-1',
          total: 500,
          items: 2,
          status: 'completed',
          products: [
            {
              id: 'product-1',
              name: 'Producto 1',
              quantity: 2,
              price: 250,
            },
          ],
        },
      ],
    });
  });
});
