import { Response, NextFunction } from 'express';
import { EnhancedAuthenticatedRequest } from './enhanced-auth';
import { createError } from './errorHandler';

function normalizeOrganizationId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return undefined;
  }

  return trimmed;
}

/**
 * Middleware para validar acceso a recursos de una organización
 * Permite a SUPER_ADMIN acceder a cualquier organización
 */
export const requireOrganizationAccess = (paramName: string = 'organizationId') => {
  return (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestedOrgId = normalizeOrganizationId(req.params[paramName] || req.query[paramName] || req.body[paramName]);
    const userOrgId = normalizeOrganizationId(req.user?.organizationId);
    const isSuperAdmin = req.user?.roles?.some(r => r.name === 'SUPER_ADMIN');
    
    // SUPER_ADMIN puede acceder a todas las organizaciones
    if (isSuperAdmin) {
      return next();
    }
    
    // Si no hay organización solicitada, usar la del usuario
    if (!requestedOrgId) {
      return next();
    }
    
    // Validar que el usuario pertenece a la organización solicitada
    if (requestedOrgId !== userOrgId) {
      throw createError('No tienes acceso a esta organización', 403);
    }
    
    next();
  };
};

/**
 * Helper para obtener el organization_id efectivo
 * SUPER_ADMIN puede especificar organización, otros usan la suya
 */
export const getEffectiveOrganizationId = (req: EnhancedAuthenticatedRequest): string | undefined => {
  const isSuperAdmin = req.user?.roles?.some(r => r.name === 'SUPER_ADMIN');
  // Prioridad: Encabezado > Query Param > User Object
  const headerOrgId = normalizeOrganizationId(req.get('x-organization-id'));
  const queryOrgId = normalizeOrganizationId(req.query.organizationId);
  const userOrgId = normalizeOrganizationId(req.user?.organizationId);
  const requestedOrgId = headerOrgId || queryOrgId;

  if (isSuperAdmin && requestedOrgId) {
    return requestedOrgId;
  }

  // Para usuarios no admin, también permitimos el encabezado si el frontend lo envía
  return requestedOrgId || userOrgId;
};

/**
 * Middleware para agregar filtro de organización automáticamente
 */
export const applyOrganizationFilter = (
  req: EnhancedAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const orgId = getEffectiveOrganizationId(req);
  
  if (orgId) {
    req.organizationFilter = { organizationId: orgId };
  }
  
  next();
};

// Extender el tipo Request
declare global {
  namespace Express {
    interface Request {
      organizationFilter?: { organizationId: string };
    }
  }
}
