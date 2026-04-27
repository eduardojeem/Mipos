import { PrismaClient } from '@prisma/client';

interface AuditLogData {
  action: string;
  userId: string;
  organizationId: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

/**
 * Registra una acción de auditoría en la base de datos
 * Útil para rastrear operaciones críticas y cumplir con requisitos de compliance
 * 
 * @param prisma - Instancia de PrismaClient (puede ser dentro de transacción)
 * @param data - Datos de la acción a registrar
 */
export async function createAuditLog(
  prisma: PrismaClient | any,
  data: AuditLogData
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: data.resourceType,
        entityId: data.resourceId || 'N/A',
        userId: data.userId,
        userEmail: data.metadata?.userEmail || 'unknown',
        userRole: data.metadata?.userRole || 'unknown',
        ipAddress: data.ipAddress || '0.0.0.0',
        changes: data.metadata || {},
        oldData: data.oldValues || null,
        newData: data.newValues || null,
      },
    });
  } catch (error) {
    // No lanzar error para evitar que falle la operación principal
    // Solo logear en consola para debugging
    console.error('[Audit Log Error]', error);
  }
}

/**
 * Helper para crear audit log desde request de Express
 */
export function createAuditLogFromRequest(
  prisma: PrismaClient | any,
  req: any,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const user = req.user;
  
  return createAuditLog(prisma, {
    action,
    userId: user?.id || 'unknown',
    organizationId: user?.organizationId || 'unknown',
    resourceType,
    resourceId,
    metadata: {
      ...metadata,
      userEmail: user?.email,
      userRole: user?.role,
    },
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
  });
}
