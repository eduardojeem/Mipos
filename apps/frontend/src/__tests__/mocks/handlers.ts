import { http, HttpResponse } from 'msw';

// Mock data
const mockProducts = [
  {
    id: '1',
    name: 'Shampoo Test',
    sku: 'SHP-001',
    barcode: '1234567890',
    category_id: 'cat-1',
    sale_price: 100,
    wholesale_price: 80,
    cost_price: 50,
    stock_quantity: 100,
    min_stock: 10,
    is_active: true,
    iva_rate: 0.1,
  },
  {
    id: '2',
    name: 'Acondicionador Test',
    sku: 'ACD-001',
    category_id: 'cat-1',
    sale_price: 120,
    wholesale_price: 95,
    cost_price: 60,
    stock_quantity: 50,
    min_stock: 10,
    is_active: true,
    iva_rate: 0.1,
  },
];

const mockCustomers = [
  {
    id: 'cust-1',
    name: 'Cliente General',
    customer_type: 'RETAIL',
  },
  {
    id: 'cust-2',
    name: 'Cliente Mayorista',
    customer_type: 'WHOLESALE',
    credit_limit: 10000,
    credit_balance: 0,
  },
];

const mockCashSession = {
  id: 'session-1',
  user_id: 'user-1',
  opening_amount: 1000,
  status: 'OPEN',
  opened_at: new Date().toISOString(),
};

// API handlers
export const handlers = [
  // Products
  http.get('/api/products', () => {
    return HttpResponse.json(mockProducts);
  }),

  http.get('/api/products/:id', ({ params }) => {
    const product = mockProducts.find((p) => p.id === params.id);
    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(product);
  }),

  http.patch('/api/products/:id/stock', async ({ request, params }) => {
    const body = await request.json();
    const product = mockProducts.find((p) => p.id === params.id);
    
    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }

    // @ts-ignore
    product.stock_quantity = body.stock_quantity;
    return HttpResponse.json(product);
  }),

  // Customers
  http.get('/api/customers', () => {
    return HttpResponse.json(mockCustomers);
  }),

  http.post('/api/customers', async ({ request }) => {
    const body = await request.json();
    const newCustomer = {
      // @ts-ignore
      id: `cust-${Date.now()}`,
      ...body,
    };
    mockCustomers.push(newCustomer);
    return HttpResponse.json(newCustomer, { status: 201 });
  }),

  // Cash sessions
  http.get('/api/cash/status', () => {
    return HttpResponse.json(mockCashSession);
  }),

  http.post('/api/cash/open', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockCashSession,
      // @ts-ignore
      opening_amount: body.opening_amount,
      status: 'OPEN',
    });
  }),

  http.post('/api/cash/close', () => {
    return HttpResponse.json({
      ...mockCashSession,
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
    });
  }),

  // Sales
  http.post('/api/pos/sales', async ({ request }) => {
    const body = await request.json();
    
    // Simulate validation
    // @ts-ignore
    if (body.payment_method === 'CASH' && mockCashSession.status !== 'OPEN') {
      return HttpResponse.json(
        { error: 'No open cash session' },
        { status: 400 }
      );
    }

    const sale = {
      id: `sale-${Date.now()}`,
      sale_number: `V-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(sale, { status: 201 });
  }),

  http.get('/api/pos/sales/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      sale_number: `V-${params.id}`,
      total_amount: 1000,
      items: [],
      created_at: new Date().toISOString(),
    });
  }),

  // Coupons
  http.post('/api/coupons/validate', async ({ request }) => {
    const body = await request.json();
    
    // @ts-ignore
    if (body.code === 'VALID10') {
      return HttpResponse.json({
        valid: true,
        code: 'VALID10',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
      });
    }

    return HttpResponse.json(
      { valid: false, error: 'Invalid coupon code' },
      { status: 400 }
    );
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = [
  http.get('/api/products', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  http.post('/api/pos/sales', () => {
    return new HttpResponse(null, { status: 500 });
  }),
];

// Network error handlers for testing offline scenarios
export const networkErrorHandlers = [
  http.get('/api/products', () => {
    return HttpResponse.error();
  }),

  http.post('/api/pos/sales', () => {
    return HttpResponse.error();
  }),
];
