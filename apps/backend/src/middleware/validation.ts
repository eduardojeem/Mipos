import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { z } from 'zod';
import { logger } from './logger';

/**
 * Validation middleware factory
 */
export const validate = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // Validate route parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: (err as any).received
        }));

        logger.warn('Validation failed', {
          errors: validationErrors,
          path: req.path,
          method: req.method
        }, {
          requestId: (req as any).requestId,
          userId: (req as any).user?.id,
          ip: req.ip
        });

        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors
        });
      }

      logger.error('Validation middleware error', error, {
        requestId: (req as any).requestId,
        path: req.path,
        method: req.method
      });

      return res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ID parameter validation
  id: z.object({
    id: z.string().uuid('Invalid ID format')
  }),

  // Pagination query validation
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  }).refine(data => {
    return data.page >= 1 && data.limit >= 1 && data.limit <= 100;
  }, {
    message: 'Page must be >= 1 and limit must be between 1 and 100'
  }),

  // Date range validation
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'Start date must be before end date'
  }),

  // Email validation
  email: z.string().email('Invalid email format').toLowerCase(),

  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  // Phone validation
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),

  // Currency validation
  currency: z.number().positive('Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places'),

  // SKU validation
  sku: z.string().regex(/^[A-Z0-9\-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores'),

  // Status validation
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED']),

  // File upload validation
  file: z.object({
    filename: z.string().min(1, 'Filename is required'),
    mimetype: z.string().regex(/^(image|application|text)\//, 'Invalid file type'),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB')
  })
};

/**
 * Sanitization functions
 */
export const sanitize = {
  /**
   * Remove HTML tags and dangerous characters
   */
  html: (input: string): string => {
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .trim();
  },

  /**
   * Sanitize SQL input (basic protection)
   */
  sql: (input: string): string => {
    return input
      .replace(/['";\\]/g, '') // Remove SQL injection characters
      .trim();
  },

  /**
   * Sanitize filename
   */
  filename: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9\-_\.]/g, '') // Only allow alphanumeric, hyphens, underscores, and dots
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .trim();
  },

  /**
   * Normalize text input
   */
  text: (input: string): string => {
    return input
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 1000); // Limit length
  }
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error', error, {
      requestId: (req as any).requestId,
      path: req.path,
      method: req.method
    });

    res.status(500).json({
      error: 'Input processing error'
    });
    return;
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitize.text(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * File upload validation middleware
 */
export const validateFileUpload = (
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxSize: number = 5 * 1024 * 1024 // 5MB
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.file]) : [req.file];

    for (const file of files) {
      if (!file) continue;

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        logger.warn('Invalid file type uploaded', {
          filename: file.originalname,
          mimetype: file.mimetype,
          allowedTypes
        }, {
          requestId: (req as any).requestId,
          userId: (req as any).user?.id,
          ip: req.ip
        });

        return res.status(400).json({
          error: 'Invalid file type',
          allowedTypes
        });
      }

      // Check file size
      if (file.size > maxSize) {
        logger.warn('File too large uploaded', {
          filename: file.originalname,
          size: file.size,
          maxSize
        }, {
          requestId: (req as any).requestId,
          userId: (req as any).user?.id,
          ip: req.ip
        });

        return res.status(400).json({
          error: 'File too large',
          maxSize: `${maxSize / (1024 * 1024)}MB`
        });
      }

      // Sanitize filename
      if (file.originalname) {
        file.originalname = sanitize.filename(file.originalname);
      }
    }

    next();
  };
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [ip, data] of requests.entries()) {
      if (data.resetTime < windowStart) {
        requests.delete(ip);
      }
    }

    // Get or create request data
    let requestData = requests.get(key);
    if (!requestData || requestData.resetTime < windowStart) {
      requestData = { count: 0, resetTime: now + windowMs };
      requests.set(key, requestData);
    }

    // Increment request count
    requestData.count++;

    // Check if limit exceeded
    if (requestData.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: key,
        count: requestData.count,
        limit: maxRequests,
        path: req.path
      }, {
        requestId: (req as any).requestId,
        ip: req.ip
      });

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(requestData.resetTime / 1000));

    next();
  };
};

/**
 * Content-Type validation middleware
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.headers['content-type'];
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header is required'
      });
    }

    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    if (!isAllowed) {
      logger.warn('Invalid Content-Type', {
        contentType,
        allowedTypes,
        path: req.path
      }, {
        requestId: (req as any).requestId,
        ip: req.ip
      });

      return res.status(415).json({
        error: 'Unsupported Media Type',
        allowedTypes
      });
    }

    next();
  };
};

export default {
  validate,
  commonSchemas,
  sanitize,
  sanitizeInput,
  validateFileUpload,
  validateRateLimit,
  validateContentType
};