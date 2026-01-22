import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const alertSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  threshold: z.number().int().min(0).default(5),
  notificationMethods: z.array(z.enum(['email', 'push', 'dashboard'])).default(['dashboard'])
});

// Get low stock products
router.get('/low-stock', asyncHandler(async (req, res) => {
  // Fetch products and categories, then compute low stock in memory
  const [products, categories] = await Promise.all([
    prisma.product.findMany(),
    prisma.category.findMany({ select: { id: true, name: true } })
  ]);

  const categoryMap = new Map(categories.map(c => [c.id, { id: c.id, name: c.name }]));

  // Filter products: stockQuantity <= (minStock > 0 ? minStock : 5) and sort
  const lowStock = products
    .filter(p => p.stockQuantity <= (p.minStock && p.minStock > 0 ? p.minStock : 5))
    .map(p => ({
      ...p,
      category: categoryMap.get(p.categoryId) || null
    }))
    .sort((a, b) => {
      if (a.stockQuantity !== b.stockQuantity) return a.stockQuantity - b.stockQuantity;
      return (a.name || '').localeCompare(b.name || '');
    });

  // Calculate alert level for each product
  const productsWithAlerts = lowStock.map(product => {
    const threshold = product.minStock || 5;
    const percentage = (product.stockQuantity / threshold) * 100;
    
    let alertLevel: 'critical' | 'warning' | 'low';
    if (product.stockQuantity === 0) {
      alertLevel = 'critical';
    } else if (percentage <= 25) {
      alertLevel = 'critical';
    } else if (percentage <= 50) {
      alertLevel = 'warning';
    } else {
      alertLevel = 'low';
    }

    const base: Record<string, any> = product as any;
    return {
      ...base,
      alertLevel,
      threshold,
      percentage: Math.round(percentage)
    };
  });

  res.json({
    products: productsWithAlerts,
    summary: {
      total: productsWithAlerts.length,
      critical: productsWithAlerts.filter(p => p.alertLevel === 'critical').length,
      warning: productsWithAlerts.filter(p => p.alertLevel === 'warning').length,
      low: productsWithAlerts.filter(p => p.alertLevel === 'low').length
    }
  });
}));

// Get stock alert statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany();
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stockQuantity <= (p.minStock && p.minStock > 0 ? p.minStock : 5)).length;
  const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;

  res.json({
    totalProducts,
    lowStockCount,
    outOfStockCount,
    healthyStockCount: totalProducts - lowStockCount,
    lowStockPercentage: totalProducts > 0 ? Math.round((lowStockCount / totalProducts) * 100) : 0
  });
}));

// Update product minimum stock threshold
router.patch('/:productId/threshold', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { productId } = req.params;
  const { minStock } = z.object({
    minStock: z.number().int().min(0)
  }).parse(req.body);

  const product = await prisma.product.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw createError('Product not found', 404);
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: { minStock }
  });

  const category = await prisma.category.findUnique({
    where: { id: updatedProduct.categoryId }
  });

  res.json({ ...updatedProduct, category });
}));

// Bulk update minimum stock thresholds
router.patch('/bulk-threshold', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { updates } = z.object({
    updates: z.array(z.object({
      productId: z.string(),
      minStock: z.number().int().min(0)
    }))
  }).parse(req.body);

  const updatePromises = updates.map(update =>
    prisma.product.update({
      where: { id: update.productId },
      data: { minStock: update.minStock }
    })
  );

  await Promise.all(updatePromises);

  res.json({ message: 'Minimum stock thresholds updated successfully' });
}));

export default router;