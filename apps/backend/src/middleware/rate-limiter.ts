import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { securityLogger } from './security-logger';

// Rate limiter for authentication routes (login, register)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    // Log rate limit violation
    securityLogger.logRateLimit(req, {
      category: 'auth',
      limit: 5,
      windowMs: 15 * 60 * 1000
    });
    
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again later',
      retryAfter: '15 minutes'
    });
  }
});

// Rate limiter for password reset requests
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts, please try again later',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many password reset attempts',
      message: 'Please try again later',
      retryAfter: '1 hour'
    });
  }
});

// Rate limiter for general API requests
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 5000, // Much more permissive for development
  message: {
    error: 'Too many API requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Always enforce rate limiting (no environment-based skipping)
  skip: () => false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later',
      retryAfter: '15 minutes'
    });
  }
});

// Rate limiter for critical operations (user creation, deletion, etc.)
export const criticalOperationsRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 50 : 500, // More permissive for development
  message: {
    error: 'Too many critical operations, please try again later',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Always enforce rate limiting (no environment-based skipping)
  skip: () => false,
  handler: (req: Request, res: Response) => {
    // Log rate limit violation for critical operations
    securityLogger.logRateLimit(req, {
      category: 'critical_operations',
      limit: process.env.NODE_ENV === 'production' ? 50 : 500,
      windowMs: 60 * 60 * 1000
    });
    
    res.status(429).json({
      error: 'Critical operations rate limit exceeded',
      message: 'Please try again later',
      retryAfter: '1 hour'
    });
  }
});

// Rate limiter for file uploads
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per 15 minutes
  message: {
    error: 'Too many upload attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Upload rate limit exceeded',
      message: 'Please try again later',
      retryAfter: '15 minutes'
    });
  }
});

// Rate limiter for reports generation
export const reportsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 report generations per 5 minutes
  message: {
    error: 'Too many report generation requests, please try again later',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Report generation rate limit exceeded',
      message: 'Please try again later',
      retryAfter: '5 minutes'
    });
  }
});

// ==================== CASH MODULE RATE LIMITERS ====================

/**
 * Rate limiter para mutaciones de caja (abrir, cerrar, registrar movimientos)
 * Previene abuso y saturación del sistema en operaciones críticas de efectivo
 */
export const cashMutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requests por minuto por organización
  message: {
    error: 'Demasiadas operaciones de caja en poco tiempo. Por favor, espera un momento.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Usar organizationId si está disponible, sino IP
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.organizationId || req.ip || 'unknown';
  },
  
  // Skip rate limiting para super admins
  skip: (req: Request) => {
    const user = (req as any).user;
    return user?.role === 'SUPER_ADMIN';
  },
  
  handler: (req: Request, res: Response) => {
    securityLogger.logRateLimit(req, {
      category: 'cash_mutations',
      limit: 10,
      windowMs: 60 * 1000
    });
    
    res.status(429).json({
      error: 'Demasiadas operaciones de caja en poco tiempo.',
      message: 'Has excedido el límite de 10 operaciones por minuto. Por favor, espera un momento antes de intentar nuevamente.',
      retryAfter: 60
    });
  }
});

/**
 * Rate limiter más restrictivo para exportaciones de caja
 * Previene generación masiva de CSVs que pueden saturar el servidor
 */
export const cashExportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 3, // 3 exports por minuto
  message: {
    error: 'Demasiadas exportaciones en poco tiempo. Por favor, espera un momento.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.organizationId || req.ip || 'unknown';
  },
  
  skip: (req: Request) => {
    const user = (req as any).user;
    return user?.role === 'SUPER_ADMIN';
  },
  
  handler: (req: Request, res: Response) => {
    securityLogger.logRateLimit(req, {
      category: 'cash_exports',
      limit: 3,
      windowMs: 60 * 1000
    });
    
    res.status(429).json({
      error: 'Demasiadas exportaciones en poco tiempo.',
      message: 'Has excedido el límite de 3 exportaciones por minuto. Por favor, espera antes de exportar nuevamente.',
      retryAfter: 60
    });
  }
});

/**
 * Rate limiter general para lecturas de caja
 * Más permisivo pero previene consultas masivas
 */
export const cashReadLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 segundos
  max: 30, // 30 requests cada 15 segundos
  message: {
    error: 'Demasiadas consultas en poco tiempo.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.organizationId || req.ip || 'unknown';
  },
  
  skip: (req: Request) => {
    const user = (req as any).user;
    return user?.role === 'SUPER_ADMIN';
  },
  
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Demasiadas consultas en poco tiempo.',
      message: 'Por favor, reduce la frecuencia de tus consultas.',
      retryAfter: 15
    });
  }
});
