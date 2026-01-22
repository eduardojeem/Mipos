import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  error: Error | AppError | ZodError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);
  const requestId = (req as any).requestId;

  // Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      details: validationErrors,
      requestId
    });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Duplicate entry',
          message: 'A record with this value already exists',
          requestId
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Record not found',
          message: 'The requested record does not exist',
          requestId
        });
      case 'P2003':
        return res.status(400).json({
          error: 'Foreign key constraint failed',
          message: 'Referenced record does not exist',
          requestId
        });
      case 'P2014':
        return res.status(400).json({
          error: 'Invalid relation',
          message: 'The change would violate a relation constraint',
          requestId
        });
      default:
        return res.status(500).json({
          error: 'Database error',
          message: 'An error occurred while processing your request',
          requestId
        });
    }
  }

  // Custom app errors
  if ('statusCode' in error && (error as any).statusCode) {
    return res.status((error as any).statusCode).json({
      error: error.message,
      requestId
    });
  }

  // Default server error
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    requestId
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};