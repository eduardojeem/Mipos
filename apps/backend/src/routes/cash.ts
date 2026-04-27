import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';
import { cashMutationLimiter, cashExportLimiter, cashReadLimiter } from '../middleware/rate-limiter';
import { createAuditLogFromRequest } from '../lib/audit-logger';
import { getOperationalContext } from './helpers/operational-context';
import { CASH_CONFIG } from '../config/cash.config';
import {
  findConflictingOpenCashSession,
  findScopedOpenCashSession,
  isCashSessionUniqueConflict,
  validateCashOperationalContext,
} from './helpers/cash-session-context';
import { getSupabaseClient } from '../config/supabase';

const router = express.Router();

// Schemas
const openSessionSchema = z.object({
  openingAmount: z.number().min(0).max(CASH_CONFIG.limits.maxOpeningAmount),
  notes: z.string().optional(),
  branchId: z.string().optional(),
  posId: z.string().optional(),
  registerId: z.string().optional(),
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
  referenceId: z.string().optional(),
  branchId: z.string().optional(),
  posId: z.string().optional(),
  registerId: z.string().optional(),
});

const discrepancySchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['SHORTAGE', 'OVERAGE']),
  amount: z.number().min(0),
  explanation: z.string().optional()
});

function isOptionalPersistenceError(error: unknown): boolean {
  const code = String((error as { code?: unknown } | null)?.code ?? '').toUpperCase();
  const message = String((error as { message?: unknown } | null)?.message ?? error ?? '').toLowerCase();

  return (
    code === 'PGRST204' ||
    code === '42703' ||
    message.includes('does not exist') ||
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

async function persistSessionOperationalContext(
  tx: any,
  sessionId: string,
  operationalContext: ReturnType<typeof getOperationalContext>,
) {
  if (!sessionId || (!operationalContext.branchId && !operationalContext.posId)) {
    return;
  }

  await tx.cashSession.update({
    where: { id: sessionId },
    data: {
      branchId: operationalContext.branchId,
      posId: operationalContext.posId,
    },
  });
}

async function persistMovementOperationalContext(
  tx: any,
  movementId: string,
  operationalContext: ReturnType<typeof getOperationalContext>,
) {
  if (!movementId || (!operationalContext.branchId && !operationalContext.posId)) {
    return;
  }

  await tx.cashMovement.update({
    where: { id: movementId },
    data: {
      branchId: operationalContext.branchId,
      posId: operationalContext.posId,
    },
  });
}

// Get current open session
router.get('/session/current', cashReadLimiter, requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  const operationalContext = await validateCashOperationalContext(organizationId, getOperationalContext(req));
  const scopedOpenSession = await findScopedOpenCashSession(organizationId, operationalContext);
  
  const session = await prisma.cashSession.findFirst({
    where: scopedOpenSession?.id
      ? {
          id: scopedOpenSession.id,
          organizationId,
          status: 'OPEN'
        }
      : {
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
router.post('/session/open', cashMutationLimiter, requirePermission('cash', 'open'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { openingAmount, notes } = openSessionSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;
  const operationalContext = await validateCashOperationalContext(organizationId, getOperationalContext(req));
  const supabase = getSupabaseClient();
  let session: any = null;

  const conflictingOpenSession = await findConflictingOpenCashSession(organizationId, operationalContext);
  if (conflictingOpenSession) {
    throw createError('Ya existe una sesión de caja abierta para este contexto operativo', 400);
  }

  // Usar transacción para prevenir race conditions
  // Esto garantiza atomicidad entre la verificación y la creación
  if (supabase) {
    const { data, error } = await supabase
      .from('cash_sessions')
      .insert({
        organization_id: organizationId,
        opened_by: userId,
        opening_amount: openingAmount,
        status: 'OPEN',
        opened_at: new Date().toISOString(),
        notes: notes || null,
        branch_id: operationalContext.branchId,
        pos_id: operationalContext.posId,
      })
      .select('*')
      .single();

    if (error) {
      if (isCashSessionUniqueConflict(error)) {
        throw createError('Ya existe una sesión de caja abierta para este contexto operativo', 400);
      }

      throw createError(error.message || 'No se pudo abrir la caja', 500);
    }

    session = {
      ...data,
      organizationId: data.organization_id,
      openedBy: data.opened_by,
      openingAmount: Number(data.opening_amount || 0),
      openedAt: data.opened_at,
      closedAt: data.closed_at ?? null,
      branch_id: data.branch_id ?? operationalContext.branchId,
      pos_id: data.pos_id ?? operationalContext.posId,
    };
  } else {
    session = await prisma.$transaction(async (tx) => {
    // Verificar dentro de la transacción
    const existingOpen = await tx.cashSession.findFirst({ 
      where: { 
        organizationId,
        status: 'OPEN' 
      } 
    });
    
    if (existingOpen) {
      throw createError('Ya existe una sesión de caja abierta en tu organización', 400);
    }

    // Crear la sesión dentro de la misma transacción
    const createdSession = await tx.cashSession.create({
      data: {
        organizationId,
        openedBy: userId,
        openingAmount,
        status: 'OPEN',
        notes
      }
    });

    await persistSessionOperationalContext(tx, createdSession.id, operationalContext);

    return createdSession;
    });
  }

  // Audit log
  await createAuditLogFromRequest(
    prisma,
    req,
    'CASH_SESSION_OPENED',
    'CashSession',
    session.id,
    {
      openingAmount,
      notes,
      branchId: operationalContext.branchId,
      posId: operationalContext.posId,
    }
  ).catch(() => {}); // No bloquear si falla el log

  res.status(201).json({
    session: {
      ...session,
      branchId: operationalContext.branchId,
      branch_id: (session as any).branch_id ?? operationalContext.branchId,
      posId: operationalContext.posId,
      pos_id: (session as any).pos_id ?? operationalContext.posId,
    },
  });
}));

// Close session
router.post('/session/close', cashMutationLimiter, requirePermission('cash', 'close'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { closingAmount, systemExpected, notes, counts } = closeSessionSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;
  const operationalContext = await validateCashOperationalContext(organizationId, getOperationalContext(req));
  const scopedOpenSession = await findScopedOpenCashSession(organizationId, operationalContext);

  const session = await prisma.cashSession.findFirst({ 
    where: scopedOpenSession?.id
      ? {
          id: scopedOpenSession.id,
          organizationId,
          status: 'OPEN'
        }
      : {
          organizationId,
          status: 'OPEN'
        } 
  });
  if (!session) throw createError('No hay sesión de caja abierta en tu organización', 400);

  const movementTotals = await prisma.cashMovement.aggregate({
    where: {
      organizationId,
      sessionId: session.id
    },
    _sum: {
      amount: true
    }
  });

  const expected = systemExpected ?? (Number(session.openingAmount || 0) + Number(movementTotals._sum.amount || 0));
  const countTotal = Array.isArray(counts)
    ? counts.reduce((sum, count) => sum + (count.denomination * count.quantity), 0)
    : null;

  if (countTotal != null && Math.abs(countTotal - closingAmount) > 0.009) {
    throw createError('El monto de cierre debe coincidir con el total del arqueo enviado', 400);
  }

  const discrepancy = closingAmount - expected;

  const closed = await prisma.$transaction(async (tx) => {
    if (counts && counts.length > 0) {
      await tx.cashCount.deleteMany({
        where: {
          organizationId,
          sessionId: session.id
        }
      });

      await tx.cashCount.createMany({
        data: counts.map(c => ({
          organizationId,
          sessionId: session.id,
          denomination: c.denomination,
          quantity: c.quantity,
          total: c.denomination * c.quantity
        }))
      });
    }

    if (Math.abs(discrepancy) > 0.009) {
      await tx.cashDiscrepancy.create({
        data: {
          organizationId,
          sessionId: session.id,
          type: discrepancy < 0 ? 'SHORTAGE' : 'OVERAGE',
          amount: Math.abs(discrepancy),
          explanation: notes,
          reportedBy: userId
        }
      });
    }

    return tx.cashSession.update({
      where: { id: session.id },
      data: {
        closingAmount,
        closedBy: userId,
        closedAt: new Date(),
        status: 'CLOSED',
        systemExpected: expected,
        discrepancyAmount: discrepancy,
        notes
      }
    });
  });

  // Audit log
  await createAuditLogFromRequest(
    prisma,
    req,
    'CASH_SESSION_CLOSED',
    'CashSession',
    session.id,
    { closingAmount, systemExpected: expected, discrepancy, counts: counts?.length || 0 }
  ).catch(() => {}); // No bloquear si falla el log

  res.json({ session: closed });
}));

// Create movement
router.post('/movements', cashMutationLimiter, requirePermission('cash', 'move'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { sessionId, type, amount, reason, referenceType, referenceId } = movementSchema.parse(req.body);
  const userId = req.user!.id;
  const organizationId = req.user!.organizationId;
  const operationalContext = getOperationalContext(req);

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

  await persistMovementOperationalContext(prisma, movement.id, operationalContext);

  // Audit log
  await createAuditLogFromRequest(
    prisma,
    req,
    'CASH_MOVEMENT_REGISTERED',
    'CashMovement',
    movement.id,
    {
      type,
      amount,
      reason,
      sessionId,
      branchId: operationalContext.branchId,
      posId: operationalContext.posId,
    }
  ).catch(() => {}); // No bloquear si falla el log

  res.status(201).json({
    movement: {
      ...movement,
      branchId: operationalContext.branchId,
      branch_id: (movement as any).branch_id ?? operationalContext.branchId,
      posId: operationalContext.posId,
      pos_id: (movement as any).pos_id ?? operationalContext.posId,
    },
  });
}));

// List movements with pagination and filters
router.get('/movements', cashReadLimiter, requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  
  const querySchema = z.object({
    sessionId: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
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

  const sortColumn = orderBy === 'amount' ? 'amount' : orderBy === 'type' ? 'type' : 'createdAt';
  const direction = orderDir === 'asc' ? 'asc' : 'desc';
  const [movements, total] = await Promise.all([
    prisma.cashMovement.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, fullName: true, email: true } }
      },
      orderBy: { [sortColumn]: direction },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.cashMovement.count({ where })
  ]);

  // Resolve missing users: if createdByUser is null but createdBy exists,
  // try to find the user directly (handles cases where sync trigger missed some users)
  const missingUserIds = movements
    .filter(m => !m.createdByUser && m.createdBy)
    .map(m => m.createdBy);

  let resolvedUsers: Map<string, { id: string; fullName: string | null; email: string }> = new Map();
  if (missingUserIds.length > 0) {
    const found = await prisma.user.findMany({
      where: { id: { in: missingUserIds } },
      select: { id: true, fullName: true, email: true }
    });
    found.forEach(u => resolvedUsers.set(u.id, u));
  }

  const enrichedMovements = movements.map(m => ({
    ...m,
    createdByUser: m.createdByUser ?? resolvedUsers.get(m.createdBy) ?? null
  }));

  res.json({
    movements: enrichedMovements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Export movements as CSV
router.get('/movements/export', cashExportLimiter, requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
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
router.get('/sessions', cashReadLimiter, requirePermission('cash', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
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
          orderBy: { createdAt: 'desc' },
          take: 10  // Solo últimos 10 movimientos para performance
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
