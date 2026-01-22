import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { isDevMockMode } from '../config/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-auth';
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';

const router = express.Router();

// Enhanced validation schemas with better security
const contactInfoSchema = z.object({
  phone: z.string()
    .max(20, 'Phone number too long')
    .regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .optional()
    .transform(val => val ? sanitize.email(val) : val),
  address: z.string()
    .max(500, 'Address too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  contactPerson: z.string()
    .max(200, 'Contact person name too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  website: z.string()
    .url('Invalid website URL')
    .max(255, 'Website URL too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  categories: z.array(z.string().max(100)).optional()
});

// Commercial conditions schema
const commercialConditionsSchema = z.object({
  paymentTerms: z.preprocess(v => sanitize.number(v as any), z.number().min(0, 'Payment terms must be >= 0').max(180, 'Payment terms too large')).optional(),
  creditLimit: z.preprocess(v => sanitize.number(v as any), z.number().min(0, 'Credit limit must be >= 0')).optional(),
  discount: z.preprocess(v => sanitize.number(v as any), z.number().min(0, 'Discount must be >= 0').max(100, 'Discount cannot exceed 100'))
}).partial();

const createSupplierSchema = z.object({
  name: z.string()
    .min(1, 'Supplier name is required')
    .max(200, 'Supplier name too long')
    .transform(val => sanitize.string(val)),
  contactInfo: contactInfoSchema.default({}),
  // Extras accepted at top-level but stored inside contact_info JSON
  taxId: z.string().max(50, 'Tax ID too long').optional().transform(val => val ? sanitize.string(val) : val),
  notes: z.string().max(1000, 'Notes too long').optional().transform(val => val ? sanitize.string(val) : val),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  category: z.string().max(100, 'Category too long').optional().transform(val => val ? sanitize.string(val) : val),
  commercialConditions: commercialConditionsSchema.optional()
});

const updateSupplierSchema = createSupplierSchema.partial();

const enhancedQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 10;
    return Math.min(Math.max(parsed, 1), 100);
  }),
  search: z.string()
    .max(100, 'Search query too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
}).refine(data => {
  return data.page >= 1 && data.limit >= 1 && data.limit <= 100;
}, {
  message: 'Page must be >= 1, limit must be between 1 and 100'
});

// Get all suppliers with pagination
router.get('/', validateQuery(enhancedQuerySchema), asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query as any;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } }
    ];
  }

  // In development mock mode, return a static dataset to avoid DB dependency
  if (isDevMockMode()) {
    const mockSuppliers = [
      {
        id: 'mock-supplier-1',
        name: 'Proveedor Demo Uno',
        contactInfo: {
          phone: '+52 555-123-4567',
          email: 'proveedor1@demo.com',
          address: 'Av. Siempre Viva 742, CDMX',
          taxId: 'DEM123456789',
          status: 'active',
          category: 'regular'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mock-supplier-2',
        name: 'Proveedor Demo Dos',
        contactInfo: {
          phone: '+52 555-987-6543',
          email: 'proveedor2@demo.com',
          address: 'Calle Falsa 123, Guadalajara',
          taxId: 'DEM987654321',
          status: 'active',
          category: 'premium'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const pageItems = mockSuppliers.slice(skip, skip + limit);
    const suppliersWithStats = pageItems.map((s) => ({
      ...s,
      totalPurchases: 0,
      lastPurchase: null,
      _count: { purchases: 0 }
    }));

    return res.json({
      suppliers: suppliersWithStats,
      pagination: {
        page,
        limit,
        total: mockSuppliers.length,
        pages: Math.ceil(mockSuppliers.length / limit)
      }
    });
  }

  const [suppliersRaw, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: {
        // Relaciones no soportadas por el adaptador; ignoradas en Supabase
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    }),
    prisma.supplier.count({ where })
  ]);

  // Normalize supplier record (map db columns and flatten extras from contact_info)
  const normalizeSupplier = (s: any) => {
    const contactInfo = (s.contactInfo ?? s.contact_info) || {};
    const createdAt = s.createdAt ?? s.created_at;
    const updatedAt = s.updatedAt ?? s.updated_at;
    return {
      id: s.id,
      name: s.name,
      contactInfo,
      createdAt,
      updatedAt,
      taxId: contactInfo.taxId,
      notes: contactInfo.notes,
      status: contactInfo.status ?? 'active',
      category: contactInfo.category ?? 'regular',
      commercialConditions: contactInfo.commercialConditions || undefined
    };
  };

  // Calculate total purchases for each supplier
  const suppliersWithStats = await Promise.all(
    suppliersRaw.map(async (supplierRaw) => {
      const supplier = normalizeSupplier(supplierRaw);
      const totalPurchases = await prisma.purchase.aggregate({
        where: { supplierId: supplier.id },
        _sum: { total: true }
      });

      const purchasesList = await prisma.purchase.findMany({
        where: { supplierId: supplier.id },
        orderBy: { date: 'desc' }
      });

      const lastPurchase = purchasesList.length > 0 ? purchasesList[0].date : null;
      const purchasesCount = purchasesList.length;

      return {
        ...supplier,
        totalPurchases: totalPurchases._sum.total || 0,
        lastPurchase,
        _count: {
          purchases: purchasesCount
        }
      };
    })
  );

  res.json({
    suppliers: suppliersWithStats,
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
    const suppliers = [
      { id: 'mock-supplier-1', name: 'Proveedor Demo Uno', contactInfo: {} },
      { id: 'mock-supplier-2', name: 'Proveedor Demo Dos', contactInfo: {} }
    ];
    return res.json({ suppliers });
  }

  const suppliersRaw = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  });

  const suppliers = (suppliersRaw || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    contactInfo: s.contactInfo ?? s.contact_info ?? {}
  }));

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

  const contactInfo = supplierRaw.contactInfo ?? supplierRaw.contact_info ?? {};
  const supplier = {
    id: supplierRaw.id,
    name: supplierRaw.name,
    contactInfo,
    createdAt: supplierRaw.createdAt ?? supplierRaw.created_at,
    updatedAt: supplierRaw.updatedAt ?? supplierRaw.updated_at,
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
    contact_info: {
      ...(data.contactInfo || {}),
      ...(data.taxId ? { taxId: data.taxId } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.commercialConditions ? { commercialConditions: data.commercialConditions } : {})
    }
  };

  const created = await prisma.supplier.create({
    data: payload,
    include: {
      // Relaciones no soportadas por el adaptador; ignoradas en Supabase
    }
  });

  const contactInfo = created.contactInfo ?? created.contact_info ?? {};
  const supplier = {
    id: created.id,
    name: created.name,
    contactInfo,
    createdAt: created.createdAt ?? created.created_at,
    updatedAt: created.updatedAt ?? created.updated_at,
    taxId: contactInfo.taxId,
    notes: contactInfo.notes,
    status: contactInfo.status ?? 'active',
    category: contactInfo.category ?? 'regular',
    commercialConditions: contactInfo.commercialConditions || undefined
  };

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
    data: updatePayload,
    include: {
      // Relaciones no soportadas por el adaptador; ignoradas en Supabase
    }
  });

  const contactInfo = updated.contactInfo ?? updated.contact_info ?? {};
  const supplier = {
    id: updated.id,
    name: updated.name,
    contactInfo,
    createdAt: updated.createdAt ?? updated.created_at,
    updatedAt: updated.updatedAt ?? updated.updated_at,
    taxId: contactInfo.taxId,
    notes: contactInfo.notes,
    status: contactInfo.status ?? 'active',
    category: contactInfo.category ?? 'regular',
    commercialConditions: contactInfo.commercialConditions || undefined
  };

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

// Tags endpoints
const tagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100, 'Tag name too long'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.enum(['performance', 'location', 'product', 'relationship', 'custom'])
});

// Get all tags
router.get('/tags', asyncHandler(async (req, res) => {
  if (isDevMockMode()) {
    const mockTags = [
      {
        id: '1',
        name: 'Premium',
        color: '#22c55e',
        description: 'Proveedores de alta calidad y confiabilidad',
        category: 'performance',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        supplierCount: 8
      },
      {
        id: '2',
        name: 'Local',
        color: '#3b82f6',
        description: 'Proveedores locales',
        category: 'location',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        supplierCount: 12
      }
    ];
    return res.json(mockTags);
  }

  // In a real implementation, you would fetch from a tags table
  // For now, return mock data
  const tags = [
    {
      id: '1',
      name: 'Premium',
      color: '#22c55e',
      description: 'Proveedores de alta calidad y confiabilidad',
      category: 'performance',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supplierCount: 8
    }
  ];

  res.json(tags);
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