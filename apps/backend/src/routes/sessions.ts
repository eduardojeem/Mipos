import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission } from '../middleware/enhanced-auth';
import { securityLogger, SecurityEventType } from '../middleware/security-logger';
import { validateCsrf } from '../middleware/csrf';
import { stringify } from 'csv-stringify/sync';

const router = express.Router();

// Helper to parse UserAgent (simplified)
const parseUserAgent = (ua: string | null) => {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', deviceType: 'unknown' as const };
  
  const browser = ua.includes('Firefox') ? 'Firefox' : 
                  ua.includes('Chrome') ? 'Chrome' : 
                  ua.includes('Safari') ? 'Safari' : 
                  ua.includes('Edge') ? 'Edge' : 
                  ua.includes('Opera') ? 'Opera' : 'Browser';
                  
  const os = ua.includes('Windows') ? 'Windows' : 
             ua.includes('Mac OS') ? 'macOS' : 
             ua.includes('Android') ? 'Android' : 
             ua.includes('iPhone OS') || ua.includes('iOS') ? 'iOS' : 
             ua.includes('Linux') ? 'Linux' : 'OS';
             
  const deviceType = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone') ? 'mobile' :
                     ua.includes('Tablet') || ua.includes('iPad') ? 'tablet' : 'desktop';
                     
  return { browser, os, deviceType };
};

// Helper to transform session for frontend
const transformSession = (session: any) => {
  const uaInfo = parseUserAgent(session.userAgent);
  
  // Basic risk calculation
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (session.isActive && session.expiresAt && new Date(session.expiresAt) < new Date()) {
    riskLevel = 'medium';
  }
  // If multiple active sessions for different IPs (simplified check)
  // we could implement more complex logic if we passed context
  
  return {
    id: session.id,
    userId: session.userId,
    userName: session.user?.fullName || 'Usuario',
    userEmail: session.user?.email || '',
    userRole: session.user?.role || 'USER',
    sessionToken: session.supabaseSessionId || '',
    ipAddress: session.ipAddress || '0.0.0.0',
    userAgent: session.userAgent || '',
    deviceType: uaInfo.deviceType,
    browser: uaInfo.browser,
    os: uaInfo.os,
    isActive: session.isActive && (!session.expiresAt || new Date(session.expiresAt) > new Date()),
    isCurrent: false, 
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivity.toISOString(),
    expiresAt: session.expiresAt?.toISOString() || '',
    loginMethod: 'email',
    riskLevel,
  };
};

// Export sessions
router.get('/export', requirePermission('users', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  const { format = 'json' } = req.query;

  const sessions = await prisma.userSession.findMany({
    where: { user: { organizationId } },
    include: { user: { select: { fullName: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const transformed = sessions.map(transformSession);

  if (format === 'csv') {
    const csv = stringify(transformed, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sessions-${Date.now()}.csv`);
    return res.send(csv);
  }

  res.json(transformed);
}));

// Invalidate all sessions for a given user (RESTful path)
router.post('/user/:userId/terminate', validateCsrf, requirePermission('users', 'update'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) throw createError('User not found', 404);

  const updated = await prisma.userSession.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false }
  });

  securityLogger.logAuth(SecurityEventType.LOGOUT_FORCE, req, userId, user.email, {
    reason: 'Administrative invalidation',
    invalidatedSessions: updated.count
  });

  res.json({ message: 'User sessions invalidated', userId, count: updated.count });
}));

// Invalidate a single session (Compatible path for frontend)
router.post('/:sessionId/terminate', validateCsrf, requirePermission('users', 'update'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { sessionId } = req.params;

  const session = await prisma.userSession.findFirst({
    where: { id: sessionId, isActive: true },
    include: { user: { select: { id: true, email: true } } }
  });

  if (!session) throw createError('Active session not found', 404);

  await prisma.userSession.update({
    where: { id: sessionId },
    data: { isActive: false }
  });

  securityLogger.logAuth(SecurityEventType.LOGOUT_FORCE, req, session.userId, session.user.email, {
    reason: 'Administrative invalidation',
    sessionId
  });

  res.json({ message: 'Session invalidated', sessionId });
}));

// List sessions
router.get('/', requirePermission('users', 'read'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;
  const { page = 1, limit = 10, status, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { user: { organizationId } };

  if (status === 'active') where.isActive = true;
  else if (status === 'expired') where.isActive = false;

  if (search && typeof search === 'string') {
    where.OR = [
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { ipAddress: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [sessions, total] = await Promise.all([
    prisma.userSession.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    }),
    prisma.userSession.count({ where })
  ]);

  res.json({
    items: sessions.map(transformSession),
    total,
    page: Number(page),
    limit: Number(limit),
    pageCount: Math.ceil(total / Number(limit))
  });
}));

// Cleanup expired sessions
router.post('/cleanup', validateCsrf, requirePermission('users', 'update'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const organizationId = req.user!.organizationId;

  const result = await prisma.userSession.updateMany({
    where: {
      isActive: true,
      expiresAt: { lt: new Date() },
      user: { organizationId }
    },
    data: { isActive: false }
  });

  res.json({ ok: true, cleaned: result.count });
}));

export default router;
