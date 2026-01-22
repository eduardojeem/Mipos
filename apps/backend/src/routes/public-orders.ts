import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { apiRateLimit } from '../middleware/rate-limiter';

const router = express.Router();

// Validation schemas
const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be positive')
});

const customerInfoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().optional()
});

const createPublicOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  customerInfo: customerInfoSchema,
  notes: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CASH')
});

// Create public order (no authentication required)
router.post('/', apiRateLimit, asyncHandler(async (req, res) => {
  const { items, customerInfo, notes, paymentMethod } = createPublicOrderSchema.parse(req.body);

  // Validate products exist and have sufficient stock
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds
      }
    }
  });

  if (products.length !== productIds.length) {
    throw createError('One or more products not found or inactive', 404);
  }

  // Check stock availability
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      throw createError(`Product ${item.productId} not found`, 404);
    }
    
    if (product.stockQuantity < item.quantity) {
      throw createError(`Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`, 400);
    }

    // Validate price matches current product price
    const currentPrice = Number(product.salePrice);
    if (Math.abs(item.unitPrice - currentPrice) > 0.01) {
      throw createError(`Price mismatch for product ${product.name}. Current price: ${currentPrice}, Provided: ${item.unitPrice}`, 400);
    }
  }

  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findFirst({
        where: {
          OR: [
            { email: customerInfo.email },
            { phone: customerInfo.phone }
          ]
        }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: customerInfo.address || '',
            customerType: 'REGULAR',
            isActive: true,
            totalSpent: 0,
            totalOrders: 0
          }
        });
      }

      // Create sale record
      const sale = await tx.sale.create({
        data: {
          customerId: customer.id,
          total,
          paymentMethod,
          notes: notes || 'Orden del catálogo público',
          date: new Date()
        }
      });

      // Create sale items and update stock
      for (const item of items) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }
        });

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        });
      }

      // Update customer totals
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: {
            increment: total
          },
          totalOrders: {
            increment: 1
          },
          lastPurchaseDate: new Date()
        }
      });

      return { sale, customer };
    });

    // Fetch complete order data
    const completeOrder = await prisma.sale.findUnique({
      where: { id: result.sale.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true
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

    res.status(201).json({
      success: true,
      data: {
        order: completeOrder,
        message: 'Order created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating public order:', error);
    throw createError('Failed to create order', 500);
  }
}));

// Get order status by ID (no authentication required)
router.get('/:id', apiRateLimit, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true
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

  if (!order) {
    throw createError('Order not found', 404);
  }

  res.json({
    success: true,
    data: order
  });
}));

export default router;