// Advanced search endpoint with filters and sorting
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler } from '../middleware/errorHandler';
import { enhancedAuthMiddleware, requirePermission } from '../middleware/enhanced-auth';
import { validateQuery } from '../middleware/input-validator';
import { logger } from '../middleware/logger';
import { sanitize } from '../middleware/input-validator';
import { productCache } from '../services/cache.service';

const router = Router();

const listQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? Math.max(1, parseInt(val) || 1) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(Math.max(1, parseInt(val) || 20), 100) : 20),
  since: z.string().datetime().optional(),
  fields: z.string().optional()
});

router.get('/',
  enhancedAuthMiddleware,
  requirePermission('products', 'read'),
  validateQuery(listQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { page, limit, since, fields } = req.query as any;
    const skip = (page - 1) * limit;

    // Caché para consultas frecuentes sin filtros complejos
    const cacheKey = since ? null : productCache.getProductsListKey({ page, limit, fields });
    
    if (cacheKey && !since) {
      const cached = await productCache.get<any>(cacheKey);
      if (cached) {
        logger.info('Product list cache hit', { page, limit });
        return res.json(cached);
      }
    }

    const allowed = new Set([
      'id','sku','name','description','salePrice','costPrice','stockQuantity','minStock','categoryId','isActive','createdAt','updatedAt'
    ]);
    const selected: any = {};
    if (typeof fields === 'string' && fields.trim()) {
      fields.split(',').map((f: string) => f.trim()).forEach((f: string) => {
        if (allowed.has(f)) (selected as any)[f] = true;
      });
    }
    const useSelect = Object.keys(selected).length > 0;

    const where: any = {};
    if (since) {
      const dt = new Date(String(since));
      if (!Number.isNaN(dt.getTime())) {
        where.updatedAt = { gt: dt };
      }
    }

    const orderBy: any = { updatedAt: 'desc' };

    // Optimización: Selección eficiente de campos para reducir I/O
    const selectFields = useSelect ? selected : {
      id: true,
      sku: true,
      name: true,
      salePrice: true,
      stockQuantity: true,
      updatedAt: true,
      categoryId: true,
      isActive: true
    };

    // Usar consulta optimizada con índice
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: selectFields,
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    let nextSince = since || undefined;
    if (Array.isArray(rows) && rows.length > 0) {
      const maxUpdated = rows
        .map((r: any) => new Date(r.updatedAt || r.createdAt || Date.now()).getTime())
        .reduce((a: number, b: number) => Math.max(a, b), 0);
      if (maxUpdated) nextSince = new Date(maxUpdated).toISOString();
    }

    const duration = Date.now() - startTime;
    logger.info('Product list query completed', {
      duration: `${duration}ms`,
      count: rows.length,
      total,
      page,
      limit,
      hasSince: !!since,
      cached: !!cacheKey
    });

    const response = { 
      products: rows, 
      sync: { nextSince },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // Guardar en caché si es una consulta básica
    if (cacheKey && !since) {
      await productCache.set(cacheKey, response);
    }

    res.json(response);
  })
);

// Advanced search endpoint with filters and sorting
router.get('/search',
  enhancedAuthMiddleware,
  requirePermission('products', 'read'),
  validateQuery(z.object({
    q: z.string().max(100).optional(), // Main search query
    categoryId: z.string().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    stockStatus: z.enum(['all', 'in-stock', 'low-stock', 'out-of-stock']).optional(),
    sortBy: z.enum(['name', 'price', 'stock', 'createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.string().optional().transform(val => val ? Math.max(1, parseInt(val) || 1) : 1),
    limit: z.string().optional().transform(val => val ? Math.min(Math.max(1, parseInt(val) || 10), 50) : 10),
    threshold: z.string().optional().transform(val => val ? Math.max(0, parseInt(val) || 0) : undefined)
  })),
  asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const {
    q,
    categoryId,
    minPrice,
    maxPrice,
    stockStatus,
    sortBy = 'name',
    sortOrder = 'asc',
    page,
    limit,
    threshold
  } = req.query as any;
  const skip = (page - 1) * limit;
  const userId = (req as any).user?.id;

  logger.info('Advanced product search', {
    userId,
    query: q ? '[FILTERED]' : undefined,
    categoryId,
    filters: { minPrice, maxPrice, stockStatus },
    sortBy,
    sortOrder,
    page,
    limit
  });

  try {
    const cacheKey = productCache.getSearchKey(String(q || ''), { categoryId, minPrice, maxPrice, stockStatus, sortBy, sortOrder, page, limit });
    const cached = await productCache.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const where: any = {};

    // Advanced search query
    if (q) {
      const sanitizedQuery = sanitize.string(q);
      where.OR = [
        { name: { contains: sanitizedQuery, mode: 'insensitive' } },
        { sku: { contains: sanitizedQuery, mode: 'insensitive' } },
        { description: { contains: sanitizedQuery, mode: 'insensitive' } }
      ];
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Price range filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.salePrice = {};
      if (minPrice !== undefined) where.salePrice.gte = minPrice;
      if (maxPrice !== undefined) where.salePrice.lte = maxPrice;
    }

    // Stock status filter - Optimizado para usar índices
    if (stockStatus && stockStatus !== 'all') {
      switch (stockStatus) {
        case 'out-of-stock':
          where.stockQuantity = 0;
          break;
        case 'low-stock':
          // Optimización: usar raw SQL para comparación entre columnas
          where.AND = [
            { stockQuantity: { gt: 0 } },
            { stockQuantity: { lte: typeof threshold === 'number' && threshold > 0 ? threshold : 10 } }
          ];
          break;
        case 'in-stock':
          where.stockQuantity = { gt: typeof threshold === 'number' && threshold > 0 ? threshold : 10 };
          break;
      }
    }

    // Sorting
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Optimización: Selección eficiente de campos y uso de índices
    const selectFields = {
      id: true,
      sku: true,
      name: true,
      description: true,
      salePrice: true,
      costPrice: true,
      stockQuantity: true,
      minStock: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          ...selectFields,
          category: {
            select: { id: true, name: true }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    const duration = Date.now() - startTime;

    logger.info('Advanced search completed', {
      userId,
      resultsCount: products.length,
      total,
      duration: `${duration}ms`
    });

    const response = {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      search: {
        query: q,
        filters: {
          categoryId,
          priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : undefined,
          stockStatus
        },
        sort: { by: sortBy, order: sortOrder }
      }
    };
    await productCache.set(cacheKey, response);
    res.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Advanced search failed', {
      userId,
      query: q ? '[FILTERED]' : undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    });
    throw error;
  }
}));

// Export products endpoint
router.get('/export',
  enhancedAuthMiddleware,
  requirePermission('products', 'read'),
  validateQuery(z.object({
    format: z.enum(['csv', 'excel', 'json']).default('csv'),
    categoryId: z.string().optional(),
    includeInactive: z.string().optional().transform(val => val === 'true'),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  })),
  asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { format, categoryId, includeInactive, dateFrom, dateTo } = req.query as any;
  const userId = (req as any).user?.id;

  logger.info('Product export requested', {
    userId,
    format,
    categoryId,
    includeInactive,
    dateRange: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : undefined
  });

  try {
    const where: any = {};

    if (categoryId) where.categoryId = categoryId;
    if (!includeInactive) where.isActive = true;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        inventoryMovements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            type: true,
            quantity: true,
            reason: true,
            createdAt: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const duration = Date.now() - startTime;

    logger.info('Product export completed', {
      userId,
      productCount: products.length,
      format,
      duration: `${duration}ms`
    });

    // Set appropriate headers for file download
    const filename = `products_export_${new Date().toISOString().split('T')[0]}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);

    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.send(generateCSV(products));
        break;
      case 'excel':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(await generateExcel(products));
        break;
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.json({ products, exportedAt: new Date().toISOString(), count: products.length });
        break;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Product export failed', {
      userId,
      format,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    });
    throw error;
  }
}));

// Helper functions for export
function generateCSV(products: any[]): string {
  const headers = [
    'ID', 'SKU', 'Nombre', 'Descripción', 'Categoría',
    'Precio Costo', 'Precio Venta', 'Stock Actual', 'Stock Mínimo',
    'Fecha Creación', 'Última Actualización'
  ];

  const rows = products.map(product => [
    product.id,
    product.sku,
    `"${product.name.replace(/"/g, '""')}"`,
    product.description ? `"${product.description.replace(/"/g, '""')}"` : '',
    product.category?.name || '',
    product.costPrice,
    product.salePrice,
    product.stockQuantity,
    product.minStock,
    product.createdAt,
    product.updatedAt
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

async function generateExcel(products: any[]): Promise<Buffer> {
  // This would require a library like 'exceljs'
  // For now, return CSV as fallback
  return Buffer.from(generateCSV(products));
}

// Enhanced public endpoint for product selection with advanced pagination
router.get('/public', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 18), 100);
    const offset = (page - 1) * limit;
    
    const q = req.query.q as string;
    const categoryId = req.query.categoryId as string;
    const sortBy = req.query.sortBy as string || 'name';
    const sortOrder = req.query.sortOrder as string || 'asc';
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 999999;
    const showOnlyInStock = req.query.showOnlyInStock === 'true';
    const showOnlyFeatured = req.query.showOnlyFeatured === 'true';
    
    // Import supabase from index
    const { supabase } = require('../index');
    
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured'
      });
    }
    
    // Build base query with enhanced fields
    let query = supabase
      .from('products')
      .select(`
        id, sku, name, brand, sale_price, cost_price, stock_quantity, 
        category_id, is_active, created_at, updated_at,
        categories!inner(id, name)
      `)
      .eq('is_active', true);
    
    // Add search filter if provided
    if (q && q.trim()) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`);
    }
    
    // Add category filter if provided
    if (categoryId && categoryId.trim()) {
      query = query.eq('category_id', categoryId);
    }
    
    // Add price range filter
    if (minPrice > 0 || maxPrice < 999999) {
      query = query.gte('sale_price', minPrice).lte('sale_price', maxPrice);
    }
    
    // Add stock filter
    if (showOnlyInStock) {
      query = query.gt('stock_quantity', 0);
    }
    
    // Add sorting
    const ascending = sortOrder === 'asc';
    switch (sortBy) {
      case 'price':
        query = query.order('sale_price', { ascending });
        break;
      case 'stock':
        query = query.order('stock_quantity', { ascending });
        break;
      case 'created':
        query = query.order('created_at', { ascending });
        break;
      default:
        query = query.order('name', { ascending });
    }
    
    // Get total count for pagination
    const countQuery = supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    
    // Apply same filters to count query
    if (q && q.trim()) {
      countQuery.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`);
    }
    if (categoryId && categoryId.trim()) {
      countQuery.eq('category_id', categoryId);
    }
    if (minPrice > 0 || maxPrice < 999999) {
      countQuery.gte('sale_price', minPrice).lte('sale_price', maxPrice);
    }
    if (showOnlyInStock) {
      countQuery.gt('stock_quantity', 0);
    }
    
    // Execute queries in parallel
    const [{ data: products, error: productsError }, { count, error: countError }] = await Promise.all([
      query.range(offset, offset + limit - 1),
      countQuery
    ]);
    
    if (productsError) {
      console.error('Error fetching products:', productsError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching products',
        error: productsError.message
      });
    }
    
    if (countError) {
      console.error('Error counting products:', countError);
      return res.status(500).json({
        success: false,
        message: 'Error counting products',
        error: countError.message
      });
    }
    
    // Transform to match expected format with enhanced data
    const transformedProducts = (products || []).map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand || '',
      salePrice: Number(p.sale_price || 0),
      price: Number(p.sale_price || 0), // Alias for compatibility
      costPrice: Number(p.cost_price || 0),
      stockQuantity: Number(p.stock_quantity || 0),
      stock: Number(p.stock_quantity || 0), // Alias for compatibility
      categoryId: p.category_id,
      category: p.categories?.name || 'General',
      isActive: p.is_active,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      // Enhanced fields for better UX
      rating: Math.random() * 2 + 3, // Mock rating 3-5
      reviewCount: Math.floor(Math.random() * 500) + 50,
      isPopular: Math.random() > 0.7,
      isFeatured: Math.random() > 0.8,
      tags: generateProductTags(p.name, p.brand, p.categories?.name)
    }));
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    res.json({
      success: true,
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        search: q || null,
        categoryId: categoryId || null,
        priceRange: { min: minPrice, max: maxPrice },
        showOnlyInStock,
        showOnlyFeatured
      },
      sort: {
        by: sortBy,
        order: sortOrder
      }
    });
  } catch (error: any) {
    console.error('Error in public products endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Helper function to generate product tags
function generateProductTags(name: string, brand?: string, category?: string): string[] {
  const tags: string[] = [];
  
  if (brand) tags.push(brand.toLowerCase());
  if (category) tags.push(category.toLowerCase());
  
  // Generate tags based on product name
  const nameLower = name.toLowerCase();
  if (nameLower.includes('gaming')) tags.push('gaming');
  if (nameLower.includes('pro') || nameLower.includes('professional')) tags.push('profesional');
  if (nameLower.includes('wireless') || nameLower.includes('inalámbrico')) tags.push('inalámbrico');
  if (nameLower.includes('rgb')) tags.push('rgb');
  if (nameLower.includes('4k') || nameLower.includes('uhd')) tags.push('4k');
  if (nameLower.includes('ssd') || nameLower.includes('nvme')) tags.push('velocidad');
  if (nameLower.includes('bluetooth')) tags.push('bluetooth');
  if (nameLower.includes('usb')) tags.push('usb');
  
  return tags.slice(0, 4); // Limit to 4 tags
}

// Get categories endpoint for filters
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { supabase } = require('../index');
    
    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Database not configured'
      });
    }
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message
      });
    }
    
    res.json({
      success: true,
      categories: categories || []
    });
  } catch (error: any) {
    console.error('Error in categories endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.get('/validate-barcode',
  enhancedAuthMiddleware,
  requirePermission('products', 'read'),
  validateQuery(z.object({ code: z.string().min(8).max(14) })),
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.query as any;
    const valid = /^[0-9]{8,14}$/.test(String(code));
    let exists = false;
    let productId: string | null = null;
    if (valid) {
      const p = await prisma.product.findFirst({ where: { sku: String(code) }, select: { id: true } });
      exists = !!p;
      productId = p?.id || null;
    }
    res.json({ code, valid, exists, productId });
  })
);
export default router;