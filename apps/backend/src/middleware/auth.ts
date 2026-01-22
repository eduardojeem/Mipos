import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeaders, isDevMockMode, verifySupabaseToken, buildMockUserFromHeaders, mapSupabaseUserToAuth } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const isProd = process.env.NODE_ENV === 'production';
  const debugLog = (...args: any[]) => { if (!isProd) console.log(...args); };

  debugLog('🔍 Auth middleware iniciado');
  debugLog('Header keys:', Object.keys(req.headers || {}));
  
  try {
    const token = extractTokenFromHeaders(req);
    debugLog('Auth token prefix:', token ? token.slice(0, 8) + '...' : null);
    
    if (!token) {
      if (isDevMockMode()) {
        debugLog('🔧 No token, modo desarrollo activo: autenticación mock');
        req.user = buildMockUserFromHeaders(req);
        return next();
      }
      return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
    }
    debugLog('Token extraído (primeros 8 chars):', token.slice(0, 8) + '...');

    // MODO DESARROLLO: Usar autenticación mock si Supabase falla
    const isDevelopment = isDevMockMode();
    
    if (isDevelopment && token === 'mock-token') {
      debugLog('🔧 Usando autenticación mock para desarrollo');
      req.user = buildMockUserFromHeaders(req);
      debugLog('✅ Usuario mock autenticado');
      return next();
    }

    // Verify token with Supabase
    debugLog('🔍 Verificando token con Supabase...');
    const { user, error } = await verifySupabaseToken(token);
    
    debugLog('Respuesta Supabase error?:', !!error);
    debugLog('Respuesta Supabase user:', user ? { id: user.id, email: user.email } : null);
    
    if (error || !user) {
      // En desarrollo, permitir acceso con token mock como fallback
      if (isDevelopment) {
        debugLog('🔧 Supabase falló, usando usuario mock como fallback');
        req.user = buildMockUserFromHeaders(req);
        debugLog('✅ Usuario fallback autenticado');
        return next();
      }
      
      return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }

    // Use Supabase user data directly (fallback mode)
    const mapped = mapSupabaseUserToAuth(user);
    req.user = { id: mapped.id, email: mapped.email, role: mapped.role };

    debugLog('✅ Usuario autenticado exitosamente');
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed', code: 'AUTH_ERROR' });
  }
};

// Export authenticateToken as an alias for authMiddleware
export const authenticateToken = authMiddleware;

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireAdminOrCashier = requireRole(['ADMIN', 'CASHIER']);
