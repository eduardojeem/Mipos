import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';

export interface AuditableRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  auditData?: {
    action: string;
    entityType: string;
    entityId?: string;
    oldData?: any;
    newData?: any;
  };
}

export const auditLogger = async (
  req: AuditableRequest,
  res: Response,
  next: NextFunction
) => {
  // Solo auditar operaciones de modificación (POST, PUT, DELETE)
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Determinar el tipo de entidad basado en la ruta
  const getEntityTypeFromPath = (path: string): string => {
    if (path.includes('customers')) return 'CUSTOMER';
    if (path.includes('users')) return 'USER';
    if (path.includes('products')) return 'PRODUCT';
    if (path.includes('sales')) return 'SALE';
    return 'UNKNOWN';
  };

  const entityType = getEntityTypeFromPath(req.route?.path || req.path);

  // Capturar datos originales para operaciones de actualización y eliminación
  if (req.method === 'PUT' || req.method === 'DELETE') {
    const entityId = req.params.id;
    if (entityId) {
      try {
        let originalData = null;
        
        // Obtener datos originales según el tipo de entidad
        switch (entityType) {
          case 'CUSTOMER':
            originalData = await prisma.customer.findUnique({
              where: { id: entityId }
            });
            break;
          case 'USER':
            originalData = await prisma.user.findUnique({
              where: { id: entityId },
              select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                role: true,
                bio: true,
                avatar: true,
                location: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true
              }
            });
            break;
          case 'PRODUCT':
            originalData = await prisma.product.findUnique({
              where: { id: entityId }
            });
            break;
        }
        
        req.auditData = {
          action: req.method === 'PUT' ? 'UPDATE' : 'DELETE',
          entityType,
          entityId,
          oldData: originalData
        };
      } catch (error) {
        console.error('Error capturing original data for audit:', error);
      }
    }
  }

  // Interceptar la respuesta para capturar los nuevos datos
  const originalSend = res.send.bind(res);
  (res as any).send = function(this: Response, data: any) {
    // Intentar parsear la respuesta para obtener los nuevos datos
    try {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Manejar diferentes tipos de respuesta según la entidad
      const getEntityFromResponse = (data: any, type: string) => {
        switch (type) {
          case 'CUSTOMER':
            return data.customer;
          case 'USER':
            return data.user;
          case 'PRODUCT':
            return data.product;
          case 'SALE':
            return data.sale;
          default:
            return null;
        }
      };

      const entityData = getEntityFromResponse(responseData, entityType);

      if (req.auditData && entityData) {
        req.auditData.newData = entityData;
      } else if (req.method === 'POST' && entityData) {
        req.auditData = {
          action: 'CREATE',
          entityType,
          entityId: entityData.id,
          newData: entityData
        };
      }

      // Crear el registro de auditoría
      if (req.auditData && req.user) {
        createAuditLog(req.auditData, req.user, req.ip || 'unknown')
          .catch(error => console.error('Error creating audit log:', error));
      }
    } catch (error) {
      console.error('Error processing audit data:', error);
    }

    return originalSend(data);
  };

  next();
};

async function createAuditLog(
  auditData: NonNullable<AuditableRequest['auditData']>,
  user: NonNullable<AuditableRequest['user']>,
  ipAddress: string
) {
  try {
    // Determinar qué campos cambiaron
    const changes: Record<string, { old: any; new: any }> = {};
    
    if (auditData.action === 'UPDATE' && auditData.oldData && auditData.newData) {
      const oldData = auditData.oldData;
      const newData = auditData.newData;
      
      // Comparar campos importantes
      const fieldsToTrack = ['name', 'email', 'phone', 'address', 'customerType', 'status', 'isActive'];
      
      fieldsToTrack.forEach(field => {
        if (oldData[field] !== newData[field]) {
          changes[field] = {
            old: oldData[field],
            new: newData[field]
          };
        }
      });
    }

    await (prisma as any).auditLog?.create({
      data: {
        action: auditData.action,
        entityType: auditData.entityType,
        entityId: auditData.entityId || '',
        userId: user.id,
        userEmail: user.email,
        userRole: (user as any)?.role ?? ((user as any)?.roles?.map((r: any) => r.name).join(', ') ?? 'UNKNOWN'),
        ipAddress,
        changes: Object.keys(changes).length > 0 ? changes : null,
        oldData: auditData.oldData,
        newData: auditData.newData,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // No lanzar el error para no interrumpir la operación principal
  }
}

// Función para obtener logs de auditoría
export const getAuditLogs = async (filters: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  const where: any = {};

  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  const prismaAny = prisma as any;
  if (!prismaAny.auditLog) {
    return { logs: [], total: 0 };
  }
  const [logs, total] = await Promise.all([
    prismaAny.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0
    }),
    prismaAny.auditLog.count({ where })
  ]);

  return { logs, total };
};