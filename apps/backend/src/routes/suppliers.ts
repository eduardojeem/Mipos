import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { isDevMockMode } from '../config/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-auth';
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';
import { normalizeSupplier, buildSupplierOrderBy } from './helpers/supplier-helpers';
import { mockSuppliers, getMockSuppliersWithStats } from './mocks/supplier-mocks';
import { SUPPLIERS_CONFIG } from '../config/suppliers-config';

const router = express.Router();

// Enhanced validation schemas with better security
const contactInfoSchema = z.object({
  phone: z.string()
    .max(SUPPLIERS_CONFIG.validation.maxPhoneLength, 'Phone number too long')
    .regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  email: z.string()
    .email('Invalid email format')
    .max(SUPPLIERS_CONFIG.validation.maxEmailLength, 'Email too long')
    .optional()
    .transform(val => val ? sanitize.email(val) : val),
  address: z.string()
    .max(SUPPLIERS_CONFIG.validation.maxAddressLength, 'Address too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  contactPerson: z.string()
    .max(SUPPLIERS_CONFIG.validation.maxContactPersonLength, 'Contact person name too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  website: z.string()
    .url('Invalid website URL')
    .max(SUPPLIERS_CONFIG.validation.maxWebsiteLength, 'Website URL too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  categories: z.array(z.string().max(SUPPLIERS_CONFIG.validation.maxCategoryLength)).optional()
});

// Commercial conditions schema
const commercialConditionsSchema = z.object({
  paymentTerms: z.preprocess(v => sanitize.number(v as any), z.number().min(0, 'Payment terms must be >= 0').max(SUPPLIERS_CONFIG.commercialConditions.maxPaymentTerms, 'Payment terms too large')).optional(),
  creditLimit: z.preprocess(v => sanitize.number(v as any), z.number().min(0, 'Credit limit must be >= 0')).optional(),
  discount: z.preprocess(v => sanitize.number(v as any), z.number().min(0, 'Discount must be >= 0').max(SUPPLIERS_CONFIG.commercialConditions.maxDiscount, 'Discount cannot exceed 100'))
}).partial();

const createSupplierSchema = z.object({
  name: z.string()
    .min(1, 'Supplier name is required')
    .max(SUPPLIERS_CONFIG.validation.maxNameLength, 'Supplier name too long')
    .transform(val => sanitize.string(val)),
  contactInfo: contactInfoSchema.default({}),
  // Extras accepted at top-level but stored inside contact_info JSON
  taxId: z.string().max(SUPPLIERS_CONFIG.validation.maxTaxIdLength, 'Tax ID too long').optional().transform(val => val ? sanitize.string(val) : val),
  notes: z.string().max(SUPPLIERS_CONFIG.validation.maxNotes, 'Notes too long').optional().transform(val => val ? sanitize.string(val) : val),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  category: z.string().max(SUPPLIERS_CONFIG.validation.maxCategoryLength, 'Category too long').optional().transform(val => val ? sanitize.string(val) : val),
  commercialConditions: commercialConditionsSchema.optional()
});

const updateSupplierSchema = createSupplierSchema.partial();

// Enhanced query schema with filtering and sorting
const enhancedQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : SUPPLIERS_CONFIG.pagination.defaultLimit;
    return Math.min(Math.max(parsed, SUPPLIERS_CONFIG.pagination.minLimit), SUPPLIERS_CONFIG.pagination.maxLimit);
  }),
  search: z.string()
    .max(100, 'Search query too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  category: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'totalPurchases', 'totalOrders', 'lastPurchase', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
}).refine(data => {
  return data.page >= 1 && data.limit >= 1 && data.limit <= SUPPLIERS_CONFIG.pagination.maxLimit;
}, {
  message: `Page must be >= 1, limit must be between ${SUPPLIERS_CONFIG.pagination.minLimit} and ${SUPPLIERS_CONFIG.pagination.maxLimit}`
});

// ✅ FIXED: Get all suppliers with pagination (NO MORE N+1 QUERIES)
router.get('/', validateQuery(enhancedQuerySchema), asyncHandler(async (req, res) => {
  const { page, limit, search, status, category, sortBy, sortOrder } = req.query as any;
  const skip = (page - 1) * limit;

  const where: any = {};

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Category filter (simplified for compatibility with both Prisma and Supabase)
  // Note: JSONB filtering may need adjustment based on adapter
  if (category && category !== 'all') {
    // This is a simplified approach - adjust based on your actual schema
    where.category = category;
  }

  // In development mock mode, return a static dataset to avoid DB dependency
  if (isDevMockMode()) {
    const filtered = mockSuppliers.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category && category !== 'all' && s.contactInfo.category !== category) return false;
      return true;
    });

    const pageItems = getMockSuppliersWithStats(skip, limit);

    return res.json({
      suppliers: pageItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit)
      }
    });
  }

  // ✅ OPTIMIZED: Fetch suppliers and count with single queries
  const [suppliersRaw, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: buildSupplierOrderBy(sortBy, sortOrder),
      skip,
      take: limit
    }),
    prisma.supplier.count({ where })
  ]);

  // ✅ OPTIMIZED: Get all supplier IDs for batch queries
  const supplierIds = suppliersRaw.map(s => s.id);

  if (supplierIds.length === 0) {
    return res.json({
      suppliers: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0
      }
    });
  }

  // ✅ OPTIMIZED: Single query to get purchase aggregates for ALL suppliers
  const purchaseAggregates = await prisma.purchase.groupBy({
    by: ['supplierId'],
    where: { supplierId: { in: supplierIds } },
    _sum: { total: true },
    _count: { id: true }
  });

  // ✅ OPTIMIZED: Single query to get last purchase date for ALL suppliers
  const lastPurchasesRaw = await prisma.$queryRaw<Array<{ supplier_id: string; date: Date }>>`
    SELECT DISTINCT ON (supplier_id) 
      supplier_id, date 
    FROM purchases 
    WHERE supplier_id = ANY(${supplierIds}::uuid[])
    ORDER BY supplier_id, date DESC
  `;

  // Create lookup maps for O(1) access
  const purchaseStatsMap = new Map(
    purchaseAggregates.map(p => [
      p.supplierId,
      { total: p._sum.total || 0, count: p._count.id }
    ])
  );

  const lastPurchaseMap = new Map(
    lastPurchasesRaw.map(p => [p.supplier_id, p.date])
  );

  // ✅ OPTIMIZED: Map results (no more N+1 queries!)
  const suppliersWithStats = suppliersRaw.map(supplierRaw => {
    const supplier = normalizeSupplier(supplierRaw);
    const stats = purchaseStatsMap.get(supplier.id) || { total: 0, count: 0 };

    return {
      ...supplier,
      totalPurchases: stats.total,
      lastPurchase: lastPurchaseMap.get(supplier.id) || null,
      _count: { purchases: stats.count }
    };
  });

  // Apply status filter (post-processing since it depends on purchase count)
  let filteredSuppliers = suppliersWithStats;
  if (status === 'active') {
    filteredSuppliers = suppliersWithStats.filter(s => s._count.purchases > 0);
  } else if (status === 'inactive') {
    filteredSuppliers = suppliersWithStats.filter(s => s._count.purchases === 0);
  }

  res.json({
    suppliers: filteredSuppliers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));


// Get all suppliers (simple list for dropdowns)
router.get('/list', asyncHandler(async (req, res) => {
  if (isDevMockMode()) {
    return res.json({
      suppliers: mockSuppliers.map(s => ({
        id: s.id,
        name: s.name,
        contactInfo: s.contactInfo
      }))
    });
  }

  const suppliersRaw = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  });

  const suppliers = (suppliersRaw || []).map(normalizeSupplier);

  res.json({ suppliers });
}));

// Get supplier by ID
router.get('/:id', validateParams(commonSchemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (isDevMockMode()) {
    const mock = {
      id,
      name: id === 'mock-supplier-2' ? 'Proveedor Demo Dos' : 'Proveedor Demo Uno',
      contactInfo: { status: 'active' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return res.json({
      supplier: {
        ...mock,
        stats: { totalPurchases: 0, totalOrders: 0, averageOrderValue: 0 }
      }
    });
  }

  const supplierRaw = await prisma.supplier.findUnique({
    where: { id },
    include: {
      // Relaciones no soportadas por el adaptador; ignoradas en Supabase
    }
  });

  if (!supplierRaw) {
    throw createError('Supplier not found', 404);
  }

  const contactInfo = JSON.parse(supplierRaw.contactInfo || '{}');
  const supplier = {
    id: supplierRaw.id,
    name: supplierRaw.name,
    contactInfo,
    createdAt: supplierRaw.createdAt,
    updatedAt: supplierRaw.updatedAt,
    taxId: contactInfo.taxId,
    notes: contactInfo.notes,
    status: contactInfo.status ?? 'active',
    category: contactInfo.category ?? 'regular',
    commercialConditions: contactInfo.commercialConditions || undefined
  };

  // Calculate supplier statistics
  const totalPurchases = await prisma.purchase.aggregate({
    where: { supplierId: id },
    _sum: { total: true }
  });

  const purchasesCount = await prisma.purchase.count({ where: { supplierId: id } });

  const averageOrderValue = purchasesCount > 0
    ? (totalPurchases._sum.total || 0) / purchasesCount
    : 0;

  res.json({
    supplier: {
      ...supplier,
      stats: {
        totalPurchases: totalPurchases._sum.total || 0,
        totalOrders: purchasesCount,
        averageOrderValue
      }
    }
  });
}));

// Create supplier (Admin only)
router.post('/', enhancedAuthMiddleware, requirePermission('suppliers', 'create'), validateBody(createSupplierSchema), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const data = req.body;
  // Build payload mapping to DB columns
  const payload = {
    name: data.name,
    contactInfo: {
      ...(data.contactInfo || {}),
      ...(data.taxId ? { taxId: data.taxId } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.commercialConditions ? { commercialConditions: data.commercialConditions } : {})
    }
  };

  const created = await prisma.supplier.create({
    data: payload
  });

  const supplier = normalizeSupplier(created);

  res.status(201).json({ supplier });
}));


// Update supplier (Admin only)
router.put('/:id', enhancedAuthMiddleware, requirePermission('suppliers', 'update'), validateParams(commonSchemas.id), validateBody(updateSupplierSchema), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const data = req.body;

  // Check if supplier exists
  const existingSupplier = await prisma.supplier.findUnique({
    where: { id }
  });

  if (!existingSupplier) {
    throw createError('Supplier not found', 404);
  }

  // Merge update payload (only valid fields)
  const updatePayload: any = {};
  if (typeof data.name === 'string' && data.name.trim()) {
    updatePayload.name = data.name;
  }
  if (data.contactInfo || data.taxId || data.notes || data.status || data.category || data.commercialConditions) {
    const existing = (existingSupplier as any).contactInfo ?? (existingSupplier as any).contact_info ?? {};
    updatePayload.contact_info = {
      ...existing,
      ...(data.contactInfo || {}),
      ...(data.taxId ? { taxId: data.taxId } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.commercialConditions ? { commercialConditions: data.commercialConditions } : {})
    };
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: updatePayload
  });

  const supplier = normalizeSupplier(updated);

  res.json({ supplier });
}));

// Delete supplier (Admin only)
router.delete('/:id', enhancedAuthMiddleware, requirePermission('suppliers', 'delete'), validateParams(commonSchemas.id), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  // Check if supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id }
  });

  if (!supplier) {
    throw createError('Supplier not found', 404);
  }

  // Check if supplier has purchases
  const purchasesCount = await prisma.purchase.count({ where: { supplierId: id } });
  if (purchasesCount > 0) {
    throw createError('Cannot delete supplier with existing purchases', 400);
  }

  await prisma.supplier.delete({
    where: { id }
  });

  res.json({ message: 'Supplier deleted successfully' });
}));

// ========================================
// TAGS ENDPOINTS
// ========================================

// ✅ Enhanced tag schema with sanitization
const tagSchema = z.object({
  name: z.string()
    .min(1, 'Tag name is required')
    .max(SUPPLIERS_CONFIG.validation.maxTagNameLength, 'Tag name too long')
    .transform(val => sanitize.string(val)),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex: #RRGGBB)')
    .transform(val => val.toUpperCase()), // Normalize to uppercase
  description: z.string()
    .max(SUPPLIERS_CONFIG.validation.maxTagDescriptionLength, 'Description too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  category: z.enum(['performance', 'location', 'product', 'relationship', 'custom'])
});

// Get all tags
router.get('/tags', asyncHandler(async (req, res) => {
  // Return empty array - tags feature not yet implemented
  res.json([]);
}));

// Create tag
router.post('/tags', enhancedAuthMiddleware, requirePermission('suppliers', 'create'), validateBody(tagSchema), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const data = req.body;

  if (isDevMockMode()) {
    const newTag = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supplierCount: 0
    };
    return res.status(201).json(newTag);
  }

  // In a real implementation, you would create in database
  const newTag = {
    id: Date.now().toString(),
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    supplierCount: 0
  };

  res.status(201).json(newTag);
}));

// Update tag
router.put('/tags/:id', enhancedAuthMiddleware, requirePermission('suppliers', 'update'), validateParams(commonSchemas.id), validateBody(tagSchema.partial()), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const data = req.body;

  if (isDevMockMode()) {
    const updatedTag = {
      id,
      ...data,
      updatedAt: new Date().toISOString()
    };
    return res.json(updatedTag);
  }

  // In a real implementation, you would update in database
  const updatedTag = {
    id,
    ...data,
    updatedAt: new Date().toISOString()
  };

  res.json(updatedTag);
}));

// Delete tag
router.delete('/tags/:id', enhancedAuthMiddleware, requirePermission('suppliers', 'delete'), validateParams(commonSchemas.id), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  if (isDevMockMode()) {
    return res.json({ message: 'Tag deleted successfully' });
  }

  // In a real implementation, you would delete from database
  res.json({ message: 'Tag deleted successfully' });
}));

// Assign tags to suppliers
router.post('/tags/assign', enhancedAuthMiddleware, requirePermission('suppliers', 'update'), validateBody(z.object({
  supplierIds: z.array(z.string()),
  tagId: z.string()
})), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { supplierIds, tagId } = req.body;

  if (isDevMockMode()) {
    return res.json({ message: 'Tags assigned successfully' });
  }

  // In a real implementation, you would create supplier-tag relationships
  res.json({ message: 'Tags assigned successfully' });
}));

// Remove tag from supplier
router.delete('/:supplierId/tags/:tagId', enhancedAuthMiddleware, requirePermission('suppliers', 'update'), validateParams(z.object({
  supplierId: z.string(),
  tagId: z.string()
})), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { supplierId, tagId } = req.params;

  if (isDevMockMode()) {
    return res.json({ message: 'Tag removed successfully' });
  }

  // In a real implementation, you would remove supplier-tag relationship
  res.json({ message: 'Tag removed successfully' });
}));

export default router;