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