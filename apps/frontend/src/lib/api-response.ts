/**
 * Utilidades para estandarizar respuestas de API
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Estructura estándar de respuesta exitosa
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

/**
 * Estructura estándar de respuesta de error
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]> | string;
    stack?: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

/**
 * Estructura estándar de respuesta paginada
 */
export interface ApiPaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

/**
 * Códigos de error estándar
 */
export const ErrorCodes = {
  // Autenticación y Autorización (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TWO_FA_REQUIRED: '2FA_REQUIRED',
  
  // Validación (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Recursos (4xx)
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting (4xx)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Servidor (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

/**
 * Genera un ID único para la petición
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Crea una respuesta exitosa estandarizada
 */
export function successResponse<T>(
  data: T,
  options?: {
    message?: string;
    status?: number;
    meta?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    message: options?.message,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...options?.meta,
    },
  };
  
  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: options?.headers,
  });
}

/**
 * Crea una respuesta paginada estandarizada
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  },
  options?: {
    message?: string;
    status?: number;
    meta?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): NextResponse<ApiPaginatedResponse<T>> {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  const response: ApiPaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
    message: options?.message,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...options?.meta,
    },
  };
  
  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: options?.headers,
  });
}

/**
 * Crea una respuesta de error estandarizada
 */
export function errorResponse(
  code: string,
  message: string,
  options?: {
    details?: Record<string, string[]> | string;
    status?: number;
    meta?: Record<string, unknown>;
    headers?: Record<string, string>;
    error?: Error;
  }
): NextResponse<ApiErrorResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
      stack: isDevelopment && options?.error ? options.error.stack : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...options?.meta,
    },
  };
  
  return NextResponse.json(response, {
    status: options?.status || 500,
    headers: options?.headers,
  });
}

/**
 * Respuestas de error predefinidas
 */
export const ErrorResponses = {
  unauthorized: (message = 'No autorizado') =>
    errorResponse(ErrorCodes.UNAUTHORIZED, message, { status: 401 }),
  
  forbidden: (message = 'Acceso denegado') =>
    errorResponse(ErrorCodes.FORBIDDEN, message, { status: 403 }),
  
  notFound: (resource = 'Recurso', message?: string) =>
    errorResponse(
      ErrorCodes.NOT_FOUND,
      message || `${resource} no encontrado`,
      { status: 404 }
    ),
  
  validationError: (details: Record<string, string[]>, message = 'Error de validación') =>
    errorResponse(ErrorCodes.VALIDATION_ERROR, message, {
      status: 400,
      details,
    }),
  
  conflict: (message = 'El recurso ya existe') =>
    errorResponse(ErrorCodes.CONFLICT, message, { status: 409 }),
  
  rateLimitExceeded: (retryAfter?: number) =>
    errorResponse(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Límite de peticiones excedido',
      {
        status: 429,
        headers: retryAfter ? { 'Retry-After': retryAfter.toString() } : undefined,
      }
    ),
  
  internalError: (message = 'Error interno del servidor', error?: Error) =>
    errorResponse(ErrorCodes.INTERNAL_ERROR, message, {
      status: 500,
      error,
    }),
  
  databaseError: (message = 'Error de base de datos', error?: Error) =>
    errorResponse(ErrorCodes.DATABASE_ERROR, message, {
      status: 500,
      error,
    }),
  
  twoFARequired: (redirectTo = '/dashboard/profile/two-factor') =>
    errorResponse(
      ErrorCodes.TWO_FA_REQUIRED,
      'Se requiere autenticación de dos factores',
      {
        status: 403,
        meta: { redirectTo },
      }
    ),
};

/**
 * Helper para manejar errores de Zod
 */
export function handleZodError(error: z.ZodError): NextResponse<ApiErrorResponse> {
  const details: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(err.message);
  });
  
  return ErrorResponses.validationError(details);
}

/**
 * Helper para manejar errores genéricos
 */
export function handleError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof z.ZodError) {
    return handleZodError(error);
  }
  
  if (error instanceof Error) {
    return ErrorResponses.internalError(error.message, error);
  }
  
  return ErrorResponses.internalError('Error desconocido');
}

/**
 * Wrapper para route handlers con manejo de errores
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<ApiSuccessResponse<T> | ApiPaginatedResponse<T>>>
): Promise<NextResponse<ApiSuccessResponse<T> | ApiPaginatedResponse<T> | ApiErrorResponse>> {
  return handler().catch((error) => {
    console.error('Route handler error:', error);
    return handleError(error);
  });
}

/**
 * Tipos de respuesta para TypeScript
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
export type ApiPaginatedOrErrorResponse<T = unknown> = ApiPaginatedResponse<T> | ApiErrorResponse;
