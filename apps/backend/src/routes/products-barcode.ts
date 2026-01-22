import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/enhanced-auth';
import { validateParams } from '../middleware/input-validator';

const router = express.Router();

// Buscar producto por código de barras o SKU
// Nota: Actualmente el esquema Prisma no incluye el campo "barcode".
// Por compatibilidad inmediata, se busca por SKU (y se puede ampliar a nombre si se requiere).
// Cuando se agregue el campo "barcode" al modelo Product, añadirlo al OR de la consulta.
router.get(
  '/:code',
  requirePermission('products', 'read'),
  validateParams(z.object({ code: z.string().min(1).max(100) })),
  asyncHandler(async (req, res) => {
    const { code } = req.params as { code: string };

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: code },
          { barcode: code }
        ],
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      throw createError('Product not found', 404);
    }

    // Responder con el producto directamente para compatibilidad con el frontend
    res.json(product);
  })
);

export default router;
