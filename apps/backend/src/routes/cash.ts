import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';

const router = express.Router();

// Schemas
const openSessionSchema = z.object({
  openingAmount: z.number().min(0),
  notes: z.string().optional()
});

const closeSessionSchema = z.object({
  closingAmount: z.number().min(0),
  systemExpected: z.number().min(0).optional(),
  notes: z.string().optional(),
  counts: z.array(z.object({ denomination: z.number().min(0), quantity: z.number().int().min(0) })).optional()
});

const movementSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'SALE', 'RETURN', 'ADJUSTMENT']),
  amount: z.number(),
  reason: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional()
});

const discrepancySchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['SHORTAGE', 'OVERAGE']),
  amount: z.number().min(0),
  explanation: z.string().optional()
});

// Get current open session
router.get('/session/current', requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  
  const session = await prisma.cashSession.findFirst({
    where: { 
      organizationId,
      status: 'OPEN' 
    },
    orderBy: { openedAt: 'desc' },
    include: {
      openedByUser: { select: { id: true, fullName: true, email: true } },
      closedByUser: { select: { id: true, fullName: true, email: true } }
    }
  });
  res.json({ session });
}));

// Open session
router.post('/session/open', requirePermission('cash', 'open'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { openingAmount, notes } = openSessionSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  const existingOpen = await prisma.cashSession.findFirst({ 
    where: { 
      organizationId,
      status: 'OPEN' 
    } 
  });
  if (existingOpen) {
    throw createError('Ya existe una sesión de caja abierta en tu organización', 400);
  }

  const session = await prisma.cashSession.create({
    data: {
      organizationId,
      openedBy: userId,
      openingAmount,
      status: 'OPEN',
      notes
    }
  });

  res.status(201).json({ session });
}));

// Close session
router.post('/session/close', requirePermission('cash', 'close'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { closingAmount, systemExpected, notes, counts } = closeSessionSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  const session = await prisma.cashSession.findFirst({ 
    where: { 
      organizationId,
      status: 'OPEN' 
    } 
  });
  if (!session) throw createError('No hay sesión de caja abierta en tu organización', 400);

  // Save counts if provided
  if (counts && counts.length > 0) {
    await prisma.cashCount.createMany({
      data: counts.map(c => ({
        organizationId,
        sessionId: session.id,
        denomination: c.denomination,
        quantity: c.quantity,
        total: c.denomination * c.quantity
      }))
    });
  }

  const expected = systemExpected ?? null;
  const discrepancy = expected != null ? (closingAmount - (expected)) : null;

  const closed = await prisma.cashSession.update({
    where: { id: session.id },
    data: {
      closingAmount,
      closedBy: userId,
      closedAt: new Date(),
      status: 'CLOSED',
      systemExpected: expected ?? undefined,
      discrepancyAmount: discrepancy ?? undefined,
      notes
    }
  });

  res.json({ session: closed });
}));

// Create movement
router.post('/movements', requirePermission('cash', 'move'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { sessionId, type, amount, reason, referenceType, referenceId } = movementSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  const session = await prisma.cashSession.findFirst({ 
    where: { 
      id: sessionId,
      organizationId 
    } 
  });
  if (!session || session.status !== 'OPEN') throw createError('Sesión inválida o cerrada', 400);

  const sum = await prisma.cashMovement.aggregate({
    where: { 
      sessionId,
      organizationId 
    },
    _sum: { amount: true }
  });
  const currentBalance = Number(session.openingAmount || 0) + Number(sum._sum?.amount || 0);
  if (type === 'ADJUSTMENT' && amount < 0 && (currentBalance + amount) < 0) {
    throw createError('El ajuste no puede dejar el saldo por debajo de 0', 400);
  }

  // Validaciones por tipo
  if ((type === 'IN' || type === 'SALE') && amount < 0) {
    throw createError('El monto debe ser positivo para IN/SALE', 400);
  }
  if (type === 'OUT' && amount < 0) {
    throw createError('El monto debe ser positivo para OUT', 400);
  }
  if (type === 'RETURN' && amount > 0) {
    throw createError('El monto de devolución debe ser negativo', 400);
  }
  if (type === 'ADJUSTMENT' && amount === 0) {
    throw createError('El ajuste no puede ser 0', 400);
  }

  const movement = await prisma.cashMovement.create({
    data: {
      organizationId,
      sessionId,
      type,
      amount,
      reason,
      referenceType,
      referenceId,
      createdBy: userId
    }
  });

  res.status(201).json({ movement });
}));

// List movements with pagination and filters
router.get('/movements', requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  
  const querySchema = z.object({
    sessionId: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(20),
    type: z.enum(['IN', 'OUT', 'SALE', 'RETURN', 'ADJUSTMENT']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    search: z.string().optional(),
    amountMin: z.coerce.number().optional(),
    amountMax: z.coerce.number().optional(),
    userId: z.string().optional(),
    referenceType: z.string().optional(),
    include: z.enum(['user']).optional(),
    orderBy: z.enum(['date', 'amount', 'type']).optional(),
    orderDir: z.enum(['asc', 'desc']).optional()
  });

  const {
    sessionId,
    page,
    limit,
    type,
    from,
    to,
    search,
    amountMin,
    amountMax,
    userId,
    referenceType,
    include,
    orderBy,
    orderDir
  } = querySchema.parse(req.query);

  const where: any = {
    organizationId
  };
  
  if (sessionId) {
    // Verify session belongs to organization
    const session = await prisma.cashSession.findFirst({
      where: { id: sessionId, organizationId }
    });
    if (!session) throw createError('Sesión no encontrada', 404);
    where.sessionId = sessionId;
  }
  if (type) where.type = type;
  if (referenceType) where.referenceType = referenceType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (typeof amountMin === 'number' || typeof amountMax === 'number') {
    where.amount = {};
    if (typeof amountMin === 'number') where.amount.gte = amountMin;
    if (typeof amountMax === 'number') where.amount.lte = amountMax;
  }
  if (userId && userId !== 'all') {
    where.createdBy = userId;
  }
  if (search && search.trim()) {
    where.reason = { contains: search.trim(), mode: 'insensitive' };
  }

  const includeObj: any = {};
  if (include === 'user') {
    includeObj.createdByUser = { select: { id: true, fullName: true, email: true } };
  }

  const sortColumn = orderBy === 'amount' ? 'amount' : orderBy === 'type' ? 'type' : 'createdAt';
  const direction = orderDir === 'asc' ? 'asc' : 'desc';
  const [movements, total] = await Promise.all([
    prisma.cashMovement.findMany({
      where,
      include: includeObj,
      orderBy: { [sortColumn]: direction },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.cashMovement.count({ where })
  ]);

  res.json({
    movements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Export movements as CSV
router.get('/movements/export', requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  
  const querySchema = z.object({
    sessionId: z.string().optional(),
    type: z.enum(['IN', 'OUT', 'SALE', 'RETURN', 'ADJUSTMENT']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    search: z.string().optional(),
    amountMin: z.coerce.number().optional(),
    amountMax: z.coerce.number().optional(),
    userId: z.string().optional(),
    referenceType: z.string().optional(),
    include: z.enum(['user']).optional(),
    orderBy: z.enum(['date', 'amount', 'type']).optional(),
    orderDir: z.enum(['asc', 'desc']).optional()
  });

  const {
    sessionId,
    type,
    from,
    to,
    search,
    amountMin,
    amountMax,
    userId,
    referenceType,
    include,
    orderBy,
    orderDir
  } = querySchema.parse(req.query);

  const where: any = {
    organizationId
  };
  
  if (sessionId) {
    const session = await prisma.cashSession.findFirst({
      where: { id: sessionId, organizationId }
    });
    if (!session) throw createError('Sesión no encontrada', 404);
    where.sessionId = sessionId;
  }
  if (type) where.type = type;
  if (referenceType) where.referenceType = referenceType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (typeof amountMin === 'number' || typeof amountMax === 'number') {
    where.amount = {};
    if (typeof amountMin === 'number') where.amount.gte = amountMin;
    if (typeof amountMax === 'number') where.amount.lte = amountMax;
  }
  if (userId && userId !== 'all') where.createdBy = userId;
  if (search && search.trim()) where.reason = { contains: search.trim(), mode: 'insensitive' };

  const includeObj: any = {};
  if (include === 'user') includeObj.createdByUser = { select: { id: true, fullName: true, email: true } };

  const sortCol = orderBy === 'amount' ? 'amount' : orderBy === 'type' ? 'type' : 'createdAt';
  const dir = orderDir === 'asc' ? 'asc' : 'desc';
  const movements = await prisma.cashMovement.findMany({
    where,
    include: includeObj,
    orderBy: { [sortCol]: dir }
  });

  const header = ['Fecha', 'Tipo', 'Monto', 'Motivo', 'Usuario', 'Referencia'];
  const rows = movements.map((m: any) => [
    new Date(m.createdAt).toISOString(),
    m.type,
    String(m.amount),
    m.reason || '-',
    (m.createdByUser?.fullName || m.createdByUser?.email || '-'),
    m.referenceType ? `${m.referenceType}: ${m.referenceId}` : '-'
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const csvWithBOM = "\ufeff" + csv;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=movimientos_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csvWithBOM);
}));

// Record discrepancy
router.post('/discrepancies', requirePermission('cash', 'reconcile'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { sessionId, type, amount, explanation } = discrepancySchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;

  const session = await prisma.cashSession.findFirst({ 
    where: { 
      id: sessionId,
      organizationId 
    } 
  });
  if (!session) throw createError('Sesión no existe', 404);

  const discrepancy = await prisma.cashDiscrepancy.create({
    data: {
      organizationId,
      sessionId,
      type,
      amount,
      explanation,
      reportedBy: userId
    }
  });

  res.status(201).json({ discrepancy });
}));

// Get all sessions with pagination and filters
router.get('/sessions', requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  
  const {
    page = 1,
    limit = 20,
    status,
    from,
    to,
    userId
  } = req.query;

  const where: any = {
    organizationId
  };

  if (status && status !== 'all') where.status = status;
  if (from || to) {
    where.openedAt = {};
    if (from) where.openedAt.gte = new Date(from as string);
    if (to) where.openedAt.lte = new Date(to as string);
  }
  if (userId && userId !== 'all') {
    where.OR = [
      { openedBy: userId as string },
      { closedBy: userId as string }
    ];
  }

  const [sessions, total] = await Promise.all([
    prisma.cashSession.findMany({
      where,
      include: {
        openedByUser: { select: { id: true, fullName: true, email: true } },
        closedByUser: { select: { id: true, fullName: true, email: true } },
        movements: {
          select: { id: true, type: true, amount: true, reason: true },
          orderBy: { createdAt: 'desc' }
        },
        counts: true
      },
      orderBy: { openedAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    }),
    prisma.cashSession.count({ where })
  ]);

  res.json({
    sessions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
}));

// Save cash counts for a session
router.post('/sessions/:sessionId/counts', requirePermission('cash', 'close'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { sessionId } = req.params;
  const { counts } = req.body;
  const organizationId = req.user!.organizationId;

  const session = await prisma.cashSession.findFirst({ 
    where: { 
      id: sessionId,
      organizationId 
    } 
  });
  if (!session) throw createError('Sesión no encontrada', 404);

  // Delete existing counts
  await prisma.cashCount.deleteMany({ 
    where: { 
      sessionId,
      organizationId 
    } 
  });

  // Create new counts
  if (counts && counts.length > 0) {
    await prisma.cashCount.createMany({
      data: counts.map((c: any) => ({
        organizationId,
        sessionId,
        denomination: c.denomination,
        quantity: c.quantity,
        total: c.denomination * c.quantity
      }))
    });
  }

  const updatedSession = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { counts: true }
  });

  res.json({ session: updatedSession });
}));

export default router;
