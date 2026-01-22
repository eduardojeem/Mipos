import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';
import { securityLogger, SecurityEventType } from '../middleware/security-logger';

const router = express.Router();

// Invalidate all sessions for a given user
router.post('/invalidate/user/:userId', requirePermission('users', 'update'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) {
    throw createError('User not found', 404);
  }

  const updated = await prisma.userSession.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false }
  });

  securityLogger.logAuth(SecurityEventType.LOGOUT_FORCE, req, userId, user.email, {
    reason: 'Permission/role change',
    invalidatedSessions: updated.count || undefined
  });

  res.json({ message: 'User sessions invalidated', userId, count: updated.count });
}));

// Invalidate a single session by Supabase session id or internal id
router.post('/invalidate/session', requirePermission('users', 'update'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { sessionId } = z.object({ sessionId: z.string().min(1) }).parse(req.body);

  const session = await prisma.userSession.findFirst({
    where: {
      OR: [
        { id: sessionId },
        { supabaseSessionId: sessionId }
      ],
      isActive: true
    },
    include: { user: { select: { id: true, email: true } } }
  });

  if (!session) {
    throw createError('Active session not found', 404);
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { isActive: false }
  });

  securityLogger.logAuth(SecurityEventType.LOGOUT_FORCE, req, session.userId, session.user.email, {
    reason: 'Administrative invalidation',
    sessionId
  });

  res.json({ message: 'Session invalidated', sessionId: session.id });
}));

export default router;