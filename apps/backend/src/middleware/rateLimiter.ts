import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General rate limiter for all API endpoints
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intente más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Demasiadas solicitudes desde esta IP, intente más tarde.',
      retryAfter: Math.round(((req as any).rateLimit?.resetTime || 0) / 1000)
    });
  }
});

// Stricter rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: {
    error: 'Demasiados intentos de autenticación, intente más tarde.',
    retryAfter: '15 minutos'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Demasiados intentos de autenticación desde esta IP.',
      retryAfter: Math.round(((req as any).rateLimit?.resetTime || 0) / 1000)
    });
  }
});

// Rate limiter for product creation/modification (admin operations)
export const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 admin operations per windowMs
  message: {
    error: 'Demasiadas operaciones administrativas, intente más tarde.',
    retryAfter: '5 minutos'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Admin rate limit exceeded',
      message: 'Demasiadas operaciones administrativas desde esta IP.',
      retryAfter: Math.round(((req as any).rateLimit?.resetTime || 0) / 1000)
    });
  }
});

// Rate limiter for search operations
export const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 search requests per minute
  message: {
    error: 'Demasiadas búsquedas, intente más tarde.',
    retryAfter: '1 minuto'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Search rate limit exceeded',
      message: 'Demasiadas búsquedas desde esta IP.',
      retryAfter: Math.round(((req as any).rateLimit?.resetTime || 0) / 1000)
    });
  }
});

// Rate limiter for bulk operations
export const bulkOperationRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 bulk operations per windowMs
  message: {
    error: 'Demasiadas operaciones masivas, intente más tarde.',
    retryAfter: '10 minutos'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Bulk operation rate limit exceeded',
      message: 'Demasiadas operaciones masivas desde esta IP.',
      retryAfter: Math.round(((req as any).rateLimit?.resetTime || 0) / 1000)
    });
  }
});