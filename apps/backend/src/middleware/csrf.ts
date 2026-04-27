import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

/**
 * Basic CSRF validation middleware.
 * Expects a cookie 'csrf-token' and a header 'X-CSRF-Token' to match.
 */
export const validateCsrf = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfHeader = req.get('X-CSRF-Token');
  const csrfCookie = req.cookies?.['csrf-token'];

  // In development mock mode, we might want to be more lenient or skip it
  const isMock = req.get('x-env-mode') === 'mock';
  
  if (isMock) {
    return next();
  }

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return next(createError('Invalid or missing CSRF token', 403));
  }

  next();
};
