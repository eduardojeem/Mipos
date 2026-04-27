import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission, requireAnyPermission, hasPermission } from '../middleware/enhanced-auth';
import { criticalOperationsRateLimit, apiRateLimit } from '../middleware/rate-limiter';
import { loyaltyService } from '../services/loyalty';
import { syncQueue } from '../services/queue.service';
import { validateDiscountMiddleware } from '../middleware/validateDiscount';
import { getEffectiveOrganizationId } from '../middleware/multi-tenant';
import { SALES_CONFIG, DISCOUNT_THRESHOLDS, ROUNDING_CONFIG } from '../config/sales.config';
import { getSupabaseClient } from '../config/supabase';
import { getOperationalContext } from './helpers/operational-context';
import { buildSalePaymentDetails, type StoredSalePaymentDetails } from './helpers/sale-payment-details';
import { findScopedOpenCashSession } from './helpers/cash-session-context';

const router = express.Router();

function requireOrganizationId(req: EnhancedAuthenticatedRequest): string {
  const organizationId = getEffectiveOrganizationId(req);
  if (!organizationId) {
    throw createError('Organization context is required', 400);
  }
  return organizationId;
}

// Validation schemas
const saleItemSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID'), // ✅ SEGURIDAD: Validar UUID
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  // REMOVED: unitPrice - Backend will get this from the database
});

const manualDiscountSchema = z.object({
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number().min(0),
  reason: z.string().min(1, 'Discount reason is required')
});

const mixedPaymentSchema = z.object({
  type: z.enum(['CASH', 'CARD', 'TRANSFER', 'QR', 'OTHER']),
  amount: z.number().positive(),
  details: z.object({}).passthrough().optional(),
});

const createSaleSchema = z.object({
  customerId: z.string().uuid().optional(), // ✅ SEGURIDAD: Validar UUID
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'QR', 'OTHER', 'MIXED']).default('CASH'),
  // REMOVED: discount, discountType, tax - Backend will calculate these
  // NEW: Support for coupons and manual discounts
  couponCode: z.string().optional(),
  manualDiscount: manualDiscountSchema.optional(),
  notes: z.string().optional(),
  cashReceived: z.number().optional(),
  change: z.number().optional(),
  transferReference: z.string().optional(),
  mixedPayments: z.array(mixedPaymentSchema).optional(),
  paymentDetails: z.object({}).passthrough().optional(),
  branchId: z.string().optional(),
  posId: z.string().optional(),
  registerId: z.string().optional()
});

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || SALES_CONFIG.DEFAULT_LIMIT, SALES_CONFIG.MAX_LIMIT)),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format').optional(),
  customerId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
  status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED', 'REFUNDED']).optional(),
  saleType: z.enum(['RETAIL', 'WHOLESALE']).optional(),
  minAmount: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  maxAmount: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  search: z.string().max(100).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
  }
  return true;
}, 'startDate must be before or equal to endDate').refine((data) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= SALES_CONFIG.MAX_DATE_RANGE_DAYS;
  }
  return true;
}, `Date range cannot exceed ${SALES_CONFIG.MAX_DATE_RANGE_DAYS} days`);

// Get recent sales (requires sales:read permission)
router.get('/recent', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const limit = parseInt(req.query.limit as string) || SALES_CONFIG.DEFAULT_LIMIT;
  const organizationId = requireOrganizationId(req);

  try {
    const recentSales = await prisma.sale.findMany({
      where: {
        organizationId
      },
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: recentSales
    });
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ventas recientes'
    });
  }
}));

// Get all sales with pagination and filters (requires sales:read permission)
router.get('/', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { page, limit, startDate, endDate, customerId, paymentMethod, status, saleType, minAmount, maxAmount, search } = querySchema.parse(req.query);
  const organizationId = requireOrganizationId(req);
  const skip = (page - 1) * limit;

  const where: any = {
    organizationId
  };

  const parseSafeDate = (val?: string) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const start = parseSafeDate(startDate);
  const end = parseSafeDate(endDate);

  if (start && end) {
    where.date = { gte: start, lte: end };
  } else if (start) {
    where.date = { gte: start };
  } else if (end) {
    where.date = { lte: end };
  }

  if (customerId) where.customerId = customerId;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (status) where.status = status;
  if (saleType) where.saleType = saleType;
  if (typeof minAmount === 'number') where.total = { ...where.total, gte: minAmount };
  if (typeof maxAmount === 'number') where.total = { ...where.total, lte: maxAmount };
  if (search) {
    where.OR = [
      { notes: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const includeItems = req.query.include === 'items';

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true }
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true }
        },
        ...(includeItems ? {
          saleItems: {
            include: {
              product: {
                select: { id: true, name: true, sku: true }
              }
            }
          }
        } : {})
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit
    }),
    prisma.sale.count({ where })
  ]);

  res.json({
    sales,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get sale by ID (requires sales:read permission)
router.get('/:id', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const organizationId = requireOrganizationId(req);

  const sale = await prisma.sale.findFirst({
    where: {
      id,
      organizationId
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      },
      saleItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              images: true
            }
          }
        }
      }
    }
  });

  if (!sale) {
    throw createError('Sale not found', 404);
  }

  res.json({ sale });
}));

// Helper to apply legal rounding
const applyLegalRounding = (amount: number): number => {
  if (!ROUNDING_CONFIG.ENABLED) return amount;
  
  const unit = ROUNDING_CONFIG.UNIT;
  const strategy = ROUNDING_CONFIG.STRATEGY as string;
  if (strategy === 'UP') {
    return Math.ceil(amount / unit) * unit;
  } else if (strategy === 'DOWN') {
    return Math.floor(amount / unit) * unit;
  } else {
    // NEAREST
    return Math.round(amount / unit) * unit;
  }
};

function isOptionalPersistenceError(error: unknown): boolean {
  const code = String((error as { code?: unknown } | null)?.code ?? '').toUpperCase();
  const message = String((error as { message?: unknown } | null)?.message ?? error ?? '').toLowerCase();

  return (
    code === 'PGRST204' ||
    code === '42703' ||
    code === '22P02' ||
    message.includes('does not exist') ||
    message.includes('invalid input value for enum') ||
    message.includes('unknown argument')
  );
}

async function executeOptionalRaw(tx: any, query: string, ...params: any[]) {
  try {
    await tx.$executeRawUnsafe(query, ...params);
    return true;
  } catch (error) {
    if (isOptionalPersistenceError(error)) {
      return false;
    }

    throw error;
  }
}

async function persistSaleOperationalFields(
  tx: any,
  saleId: string,
  paymentDetails: StoredSalePaymentDetails,
  operationalContext: ReturnType<typeof getOperationalContext>,
) {
  await executeOptionalRaw(
    tx,
    'UPDATE sales SET payment_details = $1::jsonb WHERE id = $2',
    JSON.stringify(paymentDetails),
    saleId,
  );

  if (operationalContext.branchId || operationalContext.posId) {
    await executeOptionalRaw(
      tx,
      'UPDATE sales SET branch_id = $1, pos_id = $2 WHERE id = $3',
      operationalContext.branchId,
      operationalContext.posId,
      saleId,
    );
  }

  if (paymentDetails.primaryMethod !== paymentDetails.legacyMethod) {
    await executeOptionalRaw(
      tx,
      'UPDATE sales SET payment_method = $1 WHERE id = $2',
      paymentDetails.primaryMethod,
      saleId,
    );
  }
}

async function persistCashMovementOperationalContext(
  tx: any,
  movementId: string,
  operationalContext: ReturnType<typeof getOperationalContext>,
) {
  if (!movementId || (!operationalContext.branchId && !operationalContext.posId)) {
    return;
  }

  await executeOptionalRaw(
    tx,
    'UPDATE cash_movements SET branch_id = $1, pos_id = $2 WHERE id = $3',
    operationalContext.branchId,
    operationalContext.posId,
    movementId,
  );
}

function attachSaleOperationalFields(
  sale: any,
  paymentDetails: StoredSalePaymentDetails,
  operationalContext: ReturnType<typeof getOperationalContext>,
) {
  if (!sale) return sale;

  return {
    ...sale,
    paymentMethod: paymentDetails.primaryMethod,
    payment_method: paymentDetails.primaryMethod,
    paymentDetails,
    payment_details: paymentDetails,
    mixedPayments: paymentDetails.payments,
    cashReceived: paymentDetails.cashReceived,
    change: paymentDetails.change,
    transferReference: paymentDetails.transferReference,
    branchId: operationalContext.branchId,
    branch_id: operationalContext.branchId,
    posId: operationalContext.posId,
    pos_id: operationalContext.posId,
  };
}

function isDatabaseConnectionError(error: unknown): boolean {
  const code = String((error as { code?: unknown } | null)?.code ?? '').toUpperCase();
  const message = String((error as { message?: unknown } | null)?.message ?? error ?? '').toLowerCase();

  return (
    code === 'P1001' ||
    code === 'P1002' ||
    message.includes("can't reach database server") ||
    message.includes('database server at') ||
    message.includes('failed to connect') ||
    message.includes('connection refused') ||
    message.includes('name resolution') ||
    message.includes('getaddrinfo') ||
    message.includes('enotfound')
  );
}

async function updateSaleOperationalFieldsWithSupabase(
  supabaseClient: any,
  saleId: string,
  organizationId: string,
  paymentDetails: StoredSalePaymentDetails,
  operationalContext: ReturnType<typeof getOperationalContext>,
) {
  const updates: Array<Record<string, unknown>> = [
    { organization_id: organizationId },
    { payment_details: paymentDetails },
  ];

  if (operationalContext.branchId || operationalContext.posId) {
    updates.push({
      branch_id: operationalContext.branchId,
      pos_id: operationalContext.posId,
    });
  }

  if (paymentDetails.primaryMethod !== paymentDetails.legacyMethod) {
    updates.push({ payment_method: paymentDetails.primaryMethod });
  }

  for (const update of updates) {
    const { error } = await supabaseClient
      .from('sales')
      .update(update)
      .eq('id', saleId);

    if (error && !isOptionalPersistenceError(error)) {
      throw createError(error.message || 'No se pudieron actualizar los datos operativos de la venta', 500);
    }
  }
}

async function updateCustomerStatisticsWithSupabase(
  supabaseClient: any,
  customerId: string,
  organizationId: string,
  total: number,
) {
  const { data: customer, error: customerError } = await supabaseClient
    .from('customers')
    .select('id, total_purchases')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (customerError) {
    throw createError(customerError.message || 'No se pudo consultar el cliente para actualizar estadísticas', 500);
  }

  if (!customer) {
    throw createError('Customer not found or does not belong to your organization', 404);
  }

  const nextTotalPurchases = Number(customer.total_purchases || 0) + total;
  const { error: updateError } = await supabaseClient
    .from('customers')
    .update({
      total_purchases: nextTotalPurchases,
      last_purchase: new Date().toISOString(),
    })
    .eq('id', customerId);

  if (updateError && !isOptionalPersistenceError(updateError)) {
    throw createError(updateError.message || 'No se pudo actualizar el historial del cliente', 500);
  }
}

async function insertCashMovementForSaleWithSupabase(
  supabaseClient: any,
  saleId: string,
  amount: number,
  userId: string,
  organizationId: string,
  operationalContext: ReturnType<typeof getOperationalContext>,
) {
  if (!(amount > 0)) {
    return null;
  }

  const openSession =
    await findScopedOpenCashSession(organizationId, operationalContext) ||
    (await supabaseClient
      .from('cash_sessions')
      .select('id')
      .eq('organization_id', organizationId)
      .or('status.eq.OPEN,status.eq.open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()).data;

  if (!openSession?.id) {
    return null;
  }

  const payload = {
    organization_id: organizationId,
    session_id: openSession.id,
    type: 'SALE',
    amount,
    reason: `Venta #${saleId}`,
    reference_type: 'SALE',
    reference_id: saleId,
    created_by: userId,
    branch_id: operationalContext.branchId,
    pos_id: operationalContext.posId,
  };

  const { data, error } = await supabaseClient
    .from('cash_movements')
    .insert(payload)
    .select('id')
    .maybeSingle();

  if (!error) {
    return data;
  }

  if (!isOptionalPersistenceError(error)) {
    throw createError(error.message || 'No se pudo registrar el movimiento de caja', 500);
  }

  const { data: fallbackData, error: fallbackError } = await supabaseClient
    .from('cash_movements')
    .insert({
      organization_id: organizationId,
      session_id: openSession.id,
      type: 'SALE',
      amount,
      reason: `Venta #${saleId}`,
      reference_type: 'SALE',
      reference_id: saleId,
      created_by: userId,
    })
    .select('id')
    .maybeSingle();

  if (fallbackError) {
    throw createError(fallbackError.message || 'No se pudo registrar el movimiento de caja', 500);
  }

  return fallbackData;
}

async function fetchCompleteSaleFromSupabase(
  supabaseClient: any,
  saleId: string,
  organizationId: string,
  fallbackItems: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_amount: number;
    product: {
      id: string;
      name: string;
      sku?: string | null;
    };
  }>,
  userSnapshot: { id: string; fullName: string; email: string },
  customerSnapshot?: { id: string; name: string; phone?: string | null; email?: string | null } | null,
) {
  const { data, error } = await supabaseClient
    .from('sales')
    .select(`
      id,
      customer_id,
      user_id,
      total_amount,
      tax_amount,
      discount_amount,
      discount_type,
      coupon_code,
      payment_method,
      payment_details,
      branch_id,
      pos_id,
      status,
      sale_type,
      notes,
      created_at,
      updated_at,
      customer:customers(id, name, phone, email),
      user:users(id, full_name, email),
      saleItems:sale_items(
        id,
        sale_id,
        product_id,
        quantity,
        unit_price,
        total_price,
        discount_amount,
        product:products(id, name, sku)
      )
    `)
    .eq('id', saleId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!error && data) {
    return {
      ...data,
      user: data.user
        ? {
            id: data.user.id,
            fullName: data.user.full_name,
            email: data.user.email,
          }
        : undefined,
      saleItems: Array.isArray(data.saleItems)
        ? data.saleItems.map((item: any) => ({
            ...item,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  sku: item.product.sku,
                }
              : undefined,
          }))
        : [],
    };
  }

  return {
    id: saleId,
    customer_id: customerSnapshot?.id ?? null,
    user_id: userSnapshot.id,
    created_at: new Date().toISOString(),
    status: 'COMPLETED',
    customer: customerSnapshot
      ? {
          id: customerSnapshot.id,
          name: customerSnapshot.name,
          phone: customerSnapshot.phone,
          email: customerSnapshot.email,
        }
      : null,
    user: {
      id: userSnapshot.id,
      fullName: userSnapshot.fullName,
      email: userSnapshot.email,
    },
    saleItems: fallbackItems,
  };
}

async function createSaleWithSupabaseFallback(params: {
  organizationId: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  customerId?: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'QR' | 'OTHER' | 'MIXED';
  couponCode?: string;
  manualDiscount?: { type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number; reason: string };
  notes?: string;
  cashReceived?: number;
  change?: number;
  transferReference?: string;
  mixedPayments?: Array<{ type: 'CASH' | 'CARD' | 'TRANSFER' | 'QR' | 'OTHER'; amount: number; details?: Record<string, unknown> }>;
  paymentDetails?: Record<string, unknown>;
  operationalContext: ReturnType<typeof getOperationalContext>;
  requestUser: EnhancedAuthenticatedRequest['user'];
}) {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    throw createError('No hay un cliente Supabase configurado para procesar la venta en modo fallback', 503);
  }

  const uniqueProductIds = [...new Set(params.items.map((item) => item.productId))];
  const { data: productsData, error: productsError } = await supabaseClient
    .from('products')
    .select('id, name, sku, sale_price, stock_quantity, iva_rate, iva_included, organization_id')
    .in('id', uniqueProductIds)
    .eq('organization_id', params.organizationId);

  if (productsError) {
    throw createError(productsError.message || 'No se pudieron consultar los productos para la venta', 500);
  }

  const products = (productsData || []) as Array<{
    id: string;
    name: string;
    sku?: string | null;
    sale_price: number;
    stock_quantity: number;
    iva_rate?: number | null;
    iva_included?: boolean | null;
  }>;
  const requestedQuantityByProductId = new Map<string, number>();
  for (const item of params.items) {
    requestedQuantityByProductId.set(
      item.productId,
      (requestedQuantityByProductId.get(item.productId) || 0) + item.quantity,
    );
  }

  if (products.length !== uniqueProductIds.length) {
    throw createError('One or more products not found or do not belong to your organization', 404);
  }

  for (const [productId, requestedQuantity] of requestedQuantityByProductId.entries()) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) {
      throw createError(`Product ${productId} not found`, 404);
    }
    if (Number(product.stock_quantity || 0) < requestedQuantity) {
      throw createError(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Required: ${requestedQuantity}`, 400);
    }
  }

  let customerSnapshot: { id: string; name: string; phone?: string | null; email?: string | null } | null = null;
  if (params.customerId) {
    const { data: customerData, error: customerError } = await supabaseClient
      .from('customers')
      .select('id, name, phone, email')
      .eq('id', params.customerId)
      .eq('organization_id', params.organizationId)
      .maybeSingle();

    if (customerError) {
      throw createError(customerError.message || 'No se pudo consultar el cliente', 500);
    }

    if (!customerData) {
      throw createError('Customer not found or does not belong to your organization', 404);
    }

    customerSnapshot = customerData;
  }

  let subtotalWithoutTax = 0;
  let subtotalWithTax = 0;
  let taxAmount = 0;

  for (const item of params.items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) {
      throw createError(`Product ${item.productId} not found`, 404);
    }

    const unitPrice = Number(product.sale_price || 0);
    const itemTotal = unitPrice * item.quantity;
    const isTaxable = true;
    const ivaRate = Number(product.iva_rate || 0);
    const taxIncluded = Boolean(product.iva_included);

    if (isTaxable && ivaRate > 0) {
      const rate = ivaRate / 100;
      if (taxIncluded) {
        const itemSubtotalWithoutTax = itemTotal / (1 + rate);
        const itemTaxAmount = itemTotal - itemSubtotalWithoutTax;
        subtotalWithoutTax += itemSubtotalWithoutTax;
        subtotalWithTax += itemTotal;
        taxAmount += itemTaxAmount;
      } else {
        const itemTaxAmount = itemTotal * rate;
        subtotalWithoutTax += itemTotal;
        subtotalWithTax += itemTotal + itemTaxAmount;
        taxAmount += itemTaxAmount;
      }
    } else {
      subtotalWithoutTax += itemTotal;
      subtotalWithTax += itemTotal;
    }
  }

  const subtotal = subtotalWithoutTax;

  let discountAmount = 0;
  let discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' = 'FIXED_AMOUNT';

  if (params.couponCode) {
    throw createError('Coupon functionality not yet implemented', 501);
  }

  if (params.manualDiscount) {
    const { type, value, reason } = params.manualDiscount;

    if (type === 'PERCENTAGE' && value > DISCOUNT_THRESHOLDS.REQUIRES_REASON && !reason) {
      throw createError(`Discount reason is required for discounts over ${DISCOUNT_THRESHOLDS.REQUIRES_REASON}%`, 400);
    }

    if (type === 'PERCENTAGE' && value > DISCOUNT_THRESHOLDS.REQUIRES_APPROVAL) {
      const userHasPermission = await hasPermission(params.requestUser!, 'sales', 'delete');
      if (!userHasPermission) {
        throw createError(`You do not have permission to apply discounts over ${DISCOUNT_THRESHOLDS.REQUIRES_APPROVAL}%`, 403);
      }
    }

    if (type === 'PERCENTAGE') {
      if (value > 100) {
        throw createError('Percentage discount cannot exceed 100%', 400);
      }
      discountAmount = (subtotal * value) / 100;
    } else {
      discountAmount = Math.min(value, subtotal);
    }

    discountType = type;
  }

  let finalTaxAmount = taxAmount;
  const baseAfterDiscount = subtotal - discountAmount;
  const hasNonIncludedTax = params.items.some((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return Boolean(product && Number(product.iva_rate || 0) > 0 && !Boolean(product.iva_included));
  });

  if (hasNonIncludedTax && discountAmount > 0 && subtotal > 0) {
    finalTaxAmount = 0;
    for (const item of params.items) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) continue;

      const ivaRate = Number(product.iva_rate || 0);
      const taxIncluded = Boolean(product.iva_included);
      const unitPrice = Number(product.sale_price || 0);
      const itemTotal = unitPrice * item.quantity;

      if (ivaRate > 0) {
        const rate = ivaRate / 100;
        if (!taxIncluded) {
          const itemProportion = itemTotal / subtotal;
          const itemDiscount = discountAmount * itemProportion;
          const itemAfterDiscount = itemTotal - itemDiscount;
          finalTaxAmount += itemAfterDiscount * rate;
        } else {
          const itemSubtotalWithoutTax = itemTotal / (1 + rate);
          finalTaxAmount += itemTotal - itemSubtotalWithoutTax;
        }
      }
    }
  }

  const baseTotal = baseAfterDiscount + finalTaxAmount;
  const total = applyLegalRounding(baseTotal);
  const salePaymentDetails = buildSalePaymentDetails({
    paymentMethod: params.paymentMethod,
    totalAmount: total,
    mixedPayments: params.mixedPayments,
    paymentDetails: params.paymentDetails,
    cashReceived: params.cashReceived,
    change: params.change,
    transferReference: params.transferReference,
  });

  if (
    salePaymentDetails.cashAmount > 0 &&
    salePaymentDetails.cashReceived != null &&
    Number(salePaymentDetails.cashReceived) + 0.009 < salePaymentDetails.cashAmount
  ) {
    throw createError('El efectivo recibido no cubre el componente en efectivo de la venta', 400);
  }

  if (salePaymentDetails.cashAmount > 0) {
    const existingOpen = await findScopedOpenCashSession(params.organizationId, params.operationalContext);
    if (!existingOpen) {
      throw createError('La sesión de caja está cerrada en tu organización. Ábrela para aceptar efectivo.', 400);
    }
  }

  const fallbackItems = params.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)!;
    return {
      id: `${item.productId}-${item.quantity}`,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: Number(product.sale_price || 0),
      total_price: Number(product.sale_price || 0) * item.quantity,
      discount_amount: 0,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
      },
    };
  });

  let saleRow: any = null;

  try {
    const { data: rpcSale, error: rpcError } = await supabaseClient.rpc('create_sale_with_items', {
      p_customer_id: params.customerId ?? null,
      p_user_id: params.userId,
      p_total_amount: total,
      p_tax_amount: finalTaxAmount,
      p_discount_amount: discountAmount,
      p_payment_method: salePaymentDetails.legacyMethod,
      p_status: 'COMPLETED',
      p_sale_type: 'RETAIL',
      p_notes: params.notes ?? null,
      p_items: fallbackItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        discount_amount: item.discount_amount,
      })),
    });

    if (!rpcError && rpcSale?.id) {
      saleRow = rpcSale;
    }
  } catch (rpcError) {
    console.warn('Supabase RPC create_sale_with_items failed, switching to direct inserts:', rpcError);
  }

  if (!saleRow) {
    const { data: insertedSale, error: saleInsertError } = await supabaseClient
      .from('sales')
      .insert({
        organization_id: params.organizationId,
        customer_id: params.customerId ?? null,
        user_id: params.userId,
        total_amount: total,
        tax_amount: finalTaxAmount,
        discount_amount: discountAmount,
        discount_type: discountType,
        coupon_code: params.couponCode ?? null,
        payment_method: salePaymentDetails.legacyMethod,
        payment_details: salePaymentDetails,
        branch_id: params.operationalContext.branchId,
        pos_id: params.operationalContext.posId,
        status: 'COMPLETED',
        sale_type: 'RETAIL',
        notes: params.notes ?? null,
      })
      .select('id, customer_id, user_id, total_amount, tax_amount, discount_amount, discount_type, coupon_code, payment_method, payment_details, branch_id, pos_id, status, sale_type, notes, created_at, updated_at')
      .single();

    if (saleInsertError || !insertedSale) {
      throw createError(saleInsertError?.message || 'No se pudo insertar la venta en Supabase', 500);
    }

    const saleId = String(insertedSale.id);
    const { error: itemsError } = await supabaseClient
      .from('sale_items')
      .insert(fallbackItems.map((item) => ({
        sale_id: saleId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        discount_amount: item.discount_amount,
      })));

    if (itemsError) {
      await supabaseClient.from('sales').delete().eq('id', saleId);
      throw createError(itemsError.message || 'No se pudieron insertar los ítems de la venta', 500);
    }

    for (const item of params.items) {
      const { error: decrementError } = await supabaseClient.rpc('decrement_product_stock', {
        product_id: item.productId,
        quantity_to_subtract: item.quantity,
      });

      if (decrementError) {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        const nextStock = Math.max(
          0,
          Number(product.stock_quantity || 0) - (requestedQuantityByProductId.get(item.productId) || item.quantity),
        );
        const { error: stockError } = await supabaseClient
          .from('products')
          .update({ stock_quantity: nextStock })
          .eq('id', item.productId)
          .eq('organization_id', params.organizationId);

        if (stockError) {
          throw createError(stockError.message || 'No se pudo actualizar el stock del producto', 500);
        }
      }
    }

    const inventoryPayload = params.items.map((item) => ({
      product_id: item.productId,
      movement_type: 'OUT',
      quantity: item.quantity,
      reference_type: 'SALE',
      reference_id: saleId,
      notes: `Venta #${saleId}`,
      user_id: params.userId,
    }));

    const { error: inventoryError } = await supabaseClient
      .from('inventory_movements')
      .insert(inventoryPayload);

    if (inventoryError && !isOptionalPersistenceError(inventoryError)) {
      throw createError(inventoryError.message || 'No se pudo registrar el movimiento de inventario', 500);
    }

    saleRow = insertedSale;
  }

  const saleId = String(saleRow.id);

  await updateSaleOperationalFieldsWithSupabase(
    supabaseClient,
    saleId,
    params.organizationId,
    salePaymentDetails,
    params.operationalContext,
  );

  if (params.customerId) {
    await updateCustomerStatisticsWithSupabase(
      supabaseClient,
      params.customerId,
      params.organizationId,
      total,
    );
  }

  await insertCashMovementForSaleWithSupabase(
    supabaseClient,
    saleId,
    salePaymentDetails.cashAmount,
    params.userId,
    params.organizationId,
    params.operationalContext,
  );

  const completeSale = await fetchCompleteSaleFromSupabase(
    supabaseClient,
    saleId,
    params.organizationId,
    fallbackItems.map((item) => ({ ...item, id: `${saleId}-${item.product_id}` })),
    {
      id: params.userId,
      fullName: params.userFullName,
      email: params.userEmail,
    },
    customerSnapshot,
  );

  return {
    sale: attachSaleOperationalFields(completeSale, salePaymentDetails, params.operationalContext),
    summary: {
      subtotal,
      subtotalWithTax,
      discount: discountAmount,
      discountType,
      tax: finalTaxAmount,
      total,
      paymentMethod: salePaymentDetails.primaryMethod,
      paymentDetails: salePaymentDetails,
      itemCount: params.items.length,
      totalQuantity: params.items.reduce((sum, item) => sum + item.quantity, 0),
    },
    total,
  };
}

// Create sale (requires sales:create permission) - Rate limited for critical operations
router.post('/', criticalOperationsRateLimit, requirePermission('sales', 'create'), validateDiscountMiddleware, asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const {
    customerId,
    items,
    paymentMethod,
    couponCode,
    manualDiscount,
    notes,
    cashReceived,
    change,
    transferReference,
    mixedPayments,
    paymentDetails,
  } = createSaleSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = requireOrganizationId(req);
  const operationalContext = getOperationalContext(req);

  // Legacy early cash validation hook; final validation runs after totals are computed.
  if (paymentMethod === 'CASH' && req.headers['x-legacy-cash-validation'] === '1') {
    const existingOpen = await prisma.cashSession.findFirst({
      where: { organizationId, status: 'OPEN' }
    });
    if (!existingOpen) {
      throw createError('La sesión de caja está cerrada en tu organización. Ábrela para aceptar efectivo.', 400);
    }
  }

  try {
    // Validate products belong to organization and check stock
    const productIds = [...new Set(items.map(item => item.productId))];
    const requestedQuantityByProductId = new Map<string, number>();
    for (const item of items) {
      requestedQuantityByProductId.set(
        item.productId,
        (requestedQuantityByProductId.get(item.productId) || 0) + item.quantity,
      );
    }
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        organizationId
      }
    });

    if (products.length !== productIds.length) {
      throw createError('One or more products not found or do not belong to your organization', 404);
    }

  // Check stock availability
  for (const [productId, requestedQuantity] of requestedQuantityByProductId.entries()) {
    const product = products.find(p => p.id === productId);
    if (!product) {
      throw createError(`Product ${productId} not found`, 404);
    }
    if (product.stockQuantity < requestedQuantity) {
      throw createError(`Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Required: ${requestedQuantity}`, 400);
    }
  }

  // Validate customer belongs to organization (if provided)
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId
      }
    });
    if (!customer) {
      throw createError('Customer not found or does not belong to your organization', 404);
    }
  }

  // SECURITY FIX: Calculate totals using prices from DATABASE, not from client
  let subtotalWithoutTax = 0;
  let subtotalWithTax = 0;
  let taxAmount = 0;

  // Calculate subtotal and tax using DB prices
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      throw createError(`Product ${item.productId} not found`, 404);
    }

    // Use sale price from database (single source of truth)
    const unitPrice = product.salePrice;
    const itemTotal = unitPrice * item.quantity;

    // Check if product is taxable (default to true if not specified)
    const isTaxable = (product as any).isTaxable ?? true;
    
    // Calculate tax based on product's tax configuration
    if (isTaxable && product.ivaRate && product.ivaRate > 0) {
      const rate = product.ivaRate / 100;
      const taxIncluded = (product as any).ivaIncluded ?? false;

      if (taxIncluded) {
        // Tax is included in price: extract tax from total
        const itemSubtotalWithoutTax = itemTotal / (1 + rate);
        const itemTaxAmount = itemTotal - itemSubtotalWithoutTax;
        
        subtotalWithoutTax += itemSubtotalWithoutTax;
        subtotalWithTax += itemTotal;
        taxAmount += itemTaxAmount;
      } else {
        // Tax is NOT included: add tax to price
        const itemTaxAmount = itemTotal * rate;
        
        subtotalWithoutTax += itemTotal;
        subtotalWithTax += itemTotal + itemTaxAmount;
        taxAmount += itemTaxAmount;
      }
    } else {
      // No tax applied
      subtotalWithoutTax += itemTotal;
      subtotalWithTax += itemTotal;
    }
  }

  // Use subtotal without tax as the base for discounts
  const subtotal = subtotalWithoutTax;

  // Handle discounts (coupons or manual)
  let discountAmount = 0;
  let discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' = 'FIXED_AMOUNT';
  let appliedCouponCode: string | null = null;
  let discountReason: string | null = null;

  // Priority 1: Coupon code
  if (couponCode) {
    // TODO: Implement coupon validation service
    // For now, throw error if coupon is provided
    throw createError('Coupon functionality not yet implemented', 501);
  }

  // Priority 2: Manual discount
  if (manualDiscount) {
    const { type, value, reason } = manualDiscount;

    // Validate large discounts require explicit reason
    if (type === 'PERCENTAGE' && value > DISCOUNT_THRESHOLDS.REQUIRES_REASON && !reason) {
      throw createError(`Discount reason is required for discounts over ${DISCOUNT_THRESHOLDS.REQUIRES_REASON}%`, 400);
    }

    // Check if user has permission for large discounts
    if (type === 'PERCENTAGE' && value > DISCOUNT_THRESHOLDS.REQUIRES_APPROVAL) {
      const userHasPermission = await hasPermission(req.user!, 'sales', 'delete'); // TODO: Create specific permission
      if (!userHasPermission) {
        throw createError(`You do not have permission to apply discounts over ${DISCOUNT_THRESHOLDS.REQUIRES_APPROVAL}%`, 403);
      }
    }

    // Calculate discount amount on subtotal WITHOUT tax
    if (type === 'PERCENTAGE') {
      if (value > 100) {
        throw createError('Percentage discount cannot exceed 100%', 400);
      }
      discountAmount = (subtotal * value) / 100;
    } else {
      discountAmount = Math.min(value, subtotal); // Cannot exceed subtotal
    }

    discountType = type;
    discountReason = reason;
  }

  // Recalculate tax on discounted amount if tax is not included
  let finalTaxAmount = taxAmount;
  const baseAfterDiscount = subtotal - discountAmount;
  
  // If any product has tax NOT included, recalculate tax on discounted base
  let hasNonIncludedTax = false;
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (product && product.ivaRate && product.ivaRate > 0) {
      const taxIncluded = (product as any).ivaIncluded ?? false;
      if (!taxIncluded) {
        hasNonIncludedTax = true;
        break;
      }
    }
  }

  if (hasNonIncludedTax && discountAmount > 0) {
    // Recalculate tax proportionally
    finalTaxAmount = 0;
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      const isTaxable = (product as any).isTaxable ?? true;
      if (isTaxable && product.ivaRate && product.ivaRate > 0) {
        const rate = product.ivaRate / 100;
        const taxIncluded = (product as any).ivaIncluded ?? false;
        const unitPrice = product.salePrice;
        const itemTotal = unitPrice * item.quantity;

        if (!taxIncluded) {
          // Apply discount proportionally to this item
          const itemProportion = itemTotal / subtotal;
          const itemDiscount = discountAmount * itemProportion;
          const itemAfterDiscount = itemTotal - itemDiscount;
          finalTaxAmount += itemAfterDiscount * rate;
        } else {
          // Tax already included, extract from original
          const itemSubtotalWithoutTax = itemTotal / (1 + rate);
          const itemTaxAmount = itemTotal - itemSubtotalWithoutTax;
          finalTaxAmount += itemTaxAmount;
        }
      }
    }
  }

  const baseTotal = baseAfterDiscount + finalTaxAmount;
  const total = applyLegalRounding(baseTotal);
  const salePaymentDetails = buildSalePaymentDetails({
    paymentMethod,
    totalAmount: total,
    mixedPayments,
    paymentDetails,
    cashReceived,
    change,
    transferReference,
  });

  if (
    salePaymentDetails.cashAmount > 0 &&
    salePaymentDetails.cashReceived != null &&
    Number(salePaymentDetails.cashReceived) + 0.009 < salePaymentDetails.cashAmount
  ) {
    throw createError('El efectivo recibido no cubre el componente en efectivo de la venta', 400);
  }

  if (salePaymentDetails.cashAmount > 0) {
    const existingOpen =
      await findScopedOpenCashSession(organizationId, operationalContext) ||
      await prisma.cashSession.findFirst({
        where: { organizationId, status: 'OPEN' }
      });
    if (!existingOpen) {
      throw createError('La sesión de caja está cerrada en tu organización. Ábrela para aceptar efectivo.', 400);
    }
  }

  // Create sale transaction with explicit isolation level and row-level locking
  const sale = await prisma.$transaction(async (tx) => {
    // Lock all involved product rows to ensure consistent stock checks under concurrency
    const lockedProducts: Array<{ id: string; stock_quantity: number }> = await tx.$queryRaw`
      SELECT id, stock_quantity
      FROM products
      WHERE id IN (${items.map(i => i.productId)})
      FOR UPDATE
    `;

    // Build a quick lookup for locked stock quantities
    const stockById = new Map<string, number>();
    for (const p of lockedProducts) stockById.set(p.id, p.stock_quantity);

    // Validate stock again within the transaction under lock
    for (const [productId, requestedQuantity] of requestedQuantityByProductId.entries()) {
      const current = stockById.get(productId);
      if (current == null) {
        throw createError(`Product ${productId} not found`, 404);
      }
      if (current < requestedQuantity) {
        throw createError(`Insufficient stock for product ${productId}. Available: ${current}, Required: ${requestedQuantity}`, 400);
      }
    }

    // Create sale with organizationId
    const newSale = await tx.sale.create({
      data: {
        organizationId,
        userId,
        customerId: customerId || null,
        subtotal,
        discount: discountAmount,
        discountType: discountType as any,
        tax: finalTaxAmount,
        total,
        paymentMethod: salePaymentDetails.legacyMethod as any,
        notes: notes || null,
        date: new Date()
      }
    });

    await persistSaleOperationalFields(tx, newSale.id, salePaymentDetails, operationalContext);

    // Create sale items and update stock
    for (const item of items) {
      // Get product price from database (already fetched earlier)
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw createError(`Product ${item.productId} not found`, 404);
      }

      // Create sale item using DB price
      await tx.saleItem.create({
        data: {
          saleId: newSale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.salePrice // SECURITY FIX: Use price from DB, not from client
        }
      });

      // Update product stock under the same transaction/lock to prevent race conditions
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity
          }
        }
      });

      // Create inventory movement
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'OUT',
          quantity: item.quantity,
          reason: `Sale #${newSale.id}`,
          referenceId: newSale.id
        }
      });
    }

    // Update customer statistics if customer is provided
    if (customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalPurchases: {
            increment: total
          },
          lastPurchase: new Date()
        }
      });
    }

    // Create cash movement only for the effective cash component of the sale.
    if (salePaymentDetails.cashAmount > 0) {
      await createCashMovementForSale(
        tx,
        newSale.id,
        salePaymentDetails.cashAmount,
        'SALE',
        userId,
        organizationId,
        operationalContext,
      );
    }

    return newSale;
  }, { isolationLevel: 'RepeatableRead' });

  // Process loyalty points if customer is enrolled
  if (customerId) {
    try {
      // Get customer's loyalty program(s)
      const customerLoyalty = await loyaltyService.getCustomerLoyalty(customerId);
      const programId = Array.isArray(customerLoyalty)
        ? customerLoyalty[0]?.programId
        : (customerLoyalty as any)?.programId;

      if (programId) {
        // Add points for this purchase
        await loyaltyService.addPointsForPurchase(
          customerId,
          programId,
          sale.id,
          total,
          userId
        );
      }
    } catch (loyaltyError) {
      // Log loyalty error but don't fail the sale
      console.error('Error processing loyalty points:', loyaltyError);
    }
  }

  // Fetch complete sale data
  const completeSale = await prisma.sale.findUnique({
    where: { id: sale.id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      },
      saleItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true
            }
          }
        }
      }
    }
  });

  // Enviar trabajo a la cola para sincronizar con SaaS en segundo plano
  syncQueue.add('sync-sale', {
    saleId: completeSale?.id,
    organizationId: organizationId
  }).catch(err => {
    console.error('Failed to enqueue sync job for sale', completeSale?.id, err);
  });

    res.status(201).json({
      sale: attachSaleOperationalFields(completeSale, salePaymentDetails, operationalContext),
      summary: {
        subtotal,
        subtotalWithTax,
        discount: discountAmount,
        discountType,
        tax: finalTaxAmount,
        total,
        paymentMethod: salePaymentDetails.primaryMethod,
        paymentDetails: salePaymentDetails,
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      throw error;
    }

    console.warn('Primary database connection failed while processing sale, using Supabase fallback.', error);

    const fallbackResult = await createSaleWithSupabaseFallback({
      organizationId,
      userId,
      userEmail: req.user!.email,
      userFullName: req.user!.fullName,
      customerId,
      items,
      paymentMethod,
      couponCode,
      manualDiscount,
      notes,
      cashReceived,
      change,
      transferReference,
      mixedPayments,
      paymentDetails,
      operationalContext,
      requestUser: req.user,
    });

    if (customerId) {
      try {
        const customerLoyalty = await loyaltyService.getCustomerLoyalty(customerId);
        const programId = Array.isArray(customerLoyalty)
          ? customerLoyalty[0]?.programId
          : (customerLoyalty as any)?.programId;

        if (programId) {
          await loyaltyService.addPointsForPurchase(
            customerId,
            programId,
            fallbackResult.sale.id,
            fallbackResult.total,
            userId
          );
        }
      } catch (loyaltyError) {
        console.error('Error processing loyalty points:', loyaltyError);
      }
    }

    syncQueue.add('sync-sale', {
      saleId: fallbackResult.sale?.id,
      organizationId,
    }).catch(err => {
      console.error('Failed to enqueue sync job for sale', fallbackResult.sale?.id, err);
    });

    res.status(201).json({
      sale: fallbackResult.sale,
      summary: fallbackResult.summary,
    });
  }
}));

// Helper function to create cash movement for sales
async function createCashMovementForSale(
  tx: any,
  saleId: string,
  amount: number,
  type: 'SALE' | 'RETURN',
  userId: string,
  organizationId: string,
  operationalContext?: ReturnType<typeof getOperationalContext>,
) {
  const openSession =
    await findScopedOpenCashSession(organizationId, operationalContext) ||
    await tx.cashSession.findFirst({
      where: { status: 'OPEN', organizationId }
    });

  if (!openSession) {
    // No open session, skip cash movement creation
    return null;
  }

  const movement = await tx.cashMovement.create({
    data: {
      organizationId,
      sessionId: openSession.id,
      type,
      amount,
      reason: `${type === 'SALE' ? 'Venta' : 'Devolución'} #${saleId}`,
      referenceType: 'SALE',
      referenceId: saleId,
      createdBy: userId
    }
  });

  if (operationalContext) {
    await persistCashMovementOperationalContext(tx, movement.id, operationalContext);
  }

  return movement;
}



// Get today's sales summary
router.get('/summary/today', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = requireOrganizationId(req);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [salesCount, totalRevenue, salesByPaymentMethod] = await Promise.all([
    prisma.sale.count({
      where: {
        organizationId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    }),
    prisma.sale.aggregate({
      where: {
        organizationId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        total: true
      }
    }),
    prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: {
        organizationId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    })
  ]);

  res.json({
    date: today.toISOString().split('T')[0],
    salesCount,
    totalRevenue: totalRevenue._sum.total || 0,
    salesByPaymentMethod
  });
}));

// Get sales analytics
router.get('/analytics/dashboard', requirePermission('sales', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = requireOrganizationId(req);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todaySales, weekSales, monthSales, topProducts] = await Promise.all([
    // Today's sales
    prisma.sale.aggregate({
      where: {
        organizationId,
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0))
        }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    // This week's sales
    prisma.sale.aggregate({
      where: {
        organizationId,
        date: {
          gte: startOfWeek
        }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    // This month's sales
    prisma.sale.aggregate({
      where: {
        organizationId,
        date: {
          gte: startOfMonth
        }
      },
      _sum: { total: true },
      _count: { id: true }
    }),
    // Top selling products this month
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          organizationId,
          date: {
            gte: startOfMonth
          }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: SALES_CONFIG.TOP_PRODUCTS_COUNT
    })
  ]);

  // ✅ RENDIMIENTO: Resolver N+1 query con bulk fetch
  const productIds = topProducts.map(tp => tp.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      sku: true,
      salePrice: true
    }
  });

  // Crear mapa para lookup O(1)
  const productMap = new Map(products.map(p => [p.id, p]));

  // Mapear productos con detalles
  const topProductsWithDetails = topProducts.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return {
        id: item.productId,
        name: 'Unknown',
        sku: undefined,
        salePrice: undefined,
        totalSold: item._sum.quantity
      };
    }
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      salePrice: product.salePrice,
      totalSold: item._sum.quantity
    };
  });

  res.json({
    today: {
      revenue: todaySales._sum.total || 0,
      transactions: todaySales._count || 0
    },
    week: {
      revenue: weekSales._sum.total || 0,
      transactions: weekSales._count || 0
    },
    month: {
      revenue: monthSales._sum.total || 0,
      transactions: monthSales._count || 0
    },
    topProducts: topProductsWithDetails
  });
}));

export default router;
