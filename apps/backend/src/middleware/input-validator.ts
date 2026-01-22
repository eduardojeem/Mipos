import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { securityLogger } from './security-logger';

/**
 * Middleware to validate request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log validation failure
        securityLogger.logSuspiciousActivity(req, 'invalid_input', {
          validationErrors: error.errors,
          attemptedData: req.body
        });

        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware to validate request query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log validation failure
        securityLogger.logSuspiciousActivity(req, 'invalid_query_params', {
          validationErrors: error.errors,
          attemptedQuery: req.query
        });

        return res.status(400).json({
          error: 'Query validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware to validate request parameters against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log validation failure
        securityLogger.logSuspiciousActivity(req, 'invalid_params', {
          validationErrors: error.errors,
          attemptedParams: req.params
        });

        return res.status(400).json({
          error: 'Parameter validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
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
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
  }).refine(data => {
    return data.page >= 1 && data.limit >= 1 && data.limit <= 100;
  }, {
    message: 'Page must be >= 1, limit must be between 1 and 100'
  }),

  // Search query validation
  search: z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(100, 'Search query too long'),
    category: z.string().optional(),
    status: z.string().optional()
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
  })
};

/**
 * Sanitization utilities
 */
export const sanitize = {
  /**
   * Remove potentially dangerous characters from strings
   */
  string: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  },

  /**
   * Sanitize email addresses
   */
  email: (input: string): string => {
    return input.toLowerCase().trim();
  },

  /**
   * Sanitize phone numbers (remove non-numeric characters except +)
   */
  phone: (input: string): string => {
    return input.replace(/[^\d+\-\s()]/g, '').trim();
  },

  /**
   * Sanitize numeric inputs
   */
  number: (input: string | number): number => {
    const num = typeof input === 'string' ? parseFloat(input) : input;
    return isNaN(num) ? 0 : num;
  }
};

/**
 * Enhanced validation middleware that combines validation with sanitization
 */
export const validateAndSanitize = (schema: ZodSchema, sanitizeFields?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize specified fields before validation
      if (sanitizeFields && req.body) {
        sanitizeFields.forEach(field => {
          if (req.body[field] && typeof req.body[field] === 'string') {
            req.body[field] = sanitize.string(req.body[field]);
          }
        });
      }

      // Validate with schema
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log validation failure with sanitization attempt
        securityLogger.logSuspiciousActivity(req, 'validation_with_sanitization_failed', {
          validationErrors: error.errors,
          sanitizedFields: sanitizeFields,
          attemptedData: req.body
        });

        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};