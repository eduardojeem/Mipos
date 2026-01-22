import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';
import { criticalOperationsRateLimit } from '../middleware/rate-limiter';

const router = express.Router();

// Validation schemas
const createCreditSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().min(0.01, 'Amount must be positive'),
  description: z.string().optional(),
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be positive'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']).default('CASH'),
  notes: z.string().optional()
});

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Get all credit accounts with pagination and filters
router.get('/', requirePermission('credit', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { page, limit, customerId, status, startDate, endDate } = querySchema.parse(req.query);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (customerId) {
    where.customerId = customerId;
  }

  if (status) {
    where.status = status;
  }

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }

  const [credits, total] = await Promise.all([
    prisma.customerCredit.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.customerCredit.count({ where })
  ]);

  res.json({
    success: true,
    data: credits,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get credit summary for a specific customer
router.get('/customer/:customerId/summary', requirePermission('credit', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { customerId } = req.params;

  const [customer, creditSummary] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true
      }
    }),
    prisma.customerCredit.aggregate({
      where: { customerId },
      _sum: {
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true
      },
      _count: {
        id: true
      }
    })
  ]);

  if (!customer) {
    throw createError('Customer not found', 404);
  }

  const activeCredits = await prisma.customerCredit.findMany({
    where: {
      customerId,
      status: { in: ['PENDING', 'PARTIAL'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  res.json({
    success: true,
    data: {
      customer,
      summary: {
        totalCredits: creditSummary._count.id || 0,
        totalAmount: creditSummary._sum.totalAmount || 0,
        paidAmount: creditSummary._sum.paidAmount || 0,
        remainingAmount: creditSummary._sum.remainingAmount || 0
      },
      activeCredits
    }
  });
}));

// Create new credit account
router.post('/', criticalOperationsRateLimit, requirePermission('credit', 'create'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { customerId, amount, description, dueDate } = createCreditSchema.parse(req.body);
  const userId = req.user!.id;

  // Verify customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    throw createError('Customer not found', 404);
  }

  const credit = await prisma.customerCredit.create({
    data: {
      customerId,
      totalAmount: amount,
      remainingAmount: amount,
      paidAmount: 0,
      status: 'PENDING',
      description: description || `Crédito para ${customer.name}`,
      dueDate,
      createdBy: userId
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    data: credit,
    message: 'Credit account created successfully'
  });
}));

// Make payment to credit account
router.post('/:id/payment', criticalOperationsRateLimit, requirePermission('credit', 'update'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const { amount, paymentMethod, notes } = paymentSchema.parse(req.body);
  const userId = req.user!.id;

  const credit = await prisma.customerCredit.findUnique({
    where: { id }
  });

  if (!credit) {
    throw createError('Credit account not found', 404);
  }

  if (credit.status === 'PAID') {
    throw createError('Credit account is already fully paid', 400);
  }

  if (amount > credit.remainingAmount) {
    throw createError(`Payment amount cannot exceed remaining balance of ${credit.remainingAmount}`, 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create payment record
    const payment = await tx.creditPayment.create({
      data: {
        creditId: id,
        amount,
        paymentMethod,
        notes,
        createdBy: userId
      }
    });

    // Update credit account
    const newPaidAmount = credit.paidAmount + amount;
    const newRemainingAmount = credit.remainingAmount - amount;
    const newStatus = newRemainingAmount === 0 ? 'PAID' : 
                     newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';

    const updatedCredit = await tx.customerCredit.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        paidAt: newStatus === 'PAID' ? new Date() : null
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    return { payment, credit: updatedCredit };
  });

  res.json({
    success: true,
    data: result,
    message: 'Payment processed successfully'
  });
}));

// Get credit account details
router.get('/:id', requirePermission('credit', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  const credit = await prisma.customerCredit.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdByUser: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      },
      createdByUser: {
        select: {
          id: true,
          fullName: true
        }
      }
    }
  });

  if (!credit) {
    throw createError('Credit account not found', 404);
  }

  res.json({
    success: true,
    data: credit
  });
}));

// Get credit analytics
router.get('/analytics/dashboard', requirePermission('credit', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  try {
    const [
      totalCredits,
      pendingCredits,
      overdueCredits,
      totalAmount,
      paidAmount,
      remainingAmount,
      topDebtors
    ] = await Promise.all([
      // Total credit accounts
      prisma.customerCredit.count(),
      
      // Pending credits
      prisma.customerCredit.count({
        where: { status: { in: ['PENDING', 'PARTIAL'] } }
      }),
      
      // Overdue credits
      prisma.customerCredit.count({
        where: {
          status: { in: ['PENDING', 'PARTIAL'] },
          dueDate: { lt: new Date() }
        }
      }),
      
      // Financial aggregates
      prisma.customerCredit.aggregate({
        _sum: { totalAmount: true }
      }),
      
      prisma.customerCredit.aggregate({
        _sum: { paidAmount: true }
      }),
      
      prisma.customerCredit.aggregate({
        _sum: { remainingAmount: true }
      }),
      
      // Top debtors
      prisma.customerCredit.groupBy({
        by: ['customerId'],
        where: { status: { in: ['PENDING', 'PARTIAL'] } },
        _sum: { remainingAmount: true },
        orderBy: { _sum: { remainingAmount: 'desc' } },
        take: 10
      })
    ]);

    // Get customer details for top debtors
    const customerIds = topDebtors.map(d => d.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true }
    });

    const topDebtorsWithDetails = topDebtors.map(debtor => {
      const customer = customers.find(c => c.id === debtor.customerId);
      return {
        customer,
        remainingAmount: debtor._sum.remainingAmount || 0
      };
    });

    const analytics = {
      overview: {
        totalCredits,
        pendingCredits,
        overdueCredits,
        collectionRate: totalAmount._sum.totalAmount ? 
          ((paidAmount._sum.paidAmount || 0) / totalAmount._sum.totalAmount * 100).toFixed(2) : 0
      },
      financial: {
        totalAmount: totalAmount._sum.totalAmount || 0,
        paidAmount: paidAmount._sum.paidAmount || 0,
        remainingAmount: remainingAmount._sum.remainingAmount || 0
      },
      topDebtors: topDebtorsWithDetails
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting credit analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener analytics de crédito'
    });
  }
}));

export default router;