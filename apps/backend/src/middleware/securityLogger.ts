import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

// Minimal security logger fallback (avoids external dependency)
const securityLogger = {
  log(level: string, message: string, meta?: any) {
    const payload = { level, message, ...meta };
    if (level === 'error') {
      console.error('[pos-security]', JSON.stringify(payload));
    } else {
      console.log('[pos-security]', JSON.stringify(payload));
    }
  }
};

export interface SecurityEvent {
  event: string;
  userId?: string;
  userEmail?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const logSecurityEvent = (event: SecurityEvent) => {
  const logLevel = event.severity === 'critical' || event.severity === 'high' ? 'error' : 'info';
  
  securityLogger.log(logLevel, 'Security Event', {
    ...event,
    timestamp: event.timestamp.toISOString()
  });
};

// Middleware to log authentication attempts
export const logAuthAttempt = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const statusCode = res.statusCode;
    const isSuccess = statusCode >= 200 && statusCode < 300;
    
    logSecurityEvent({
      event: isSuccess ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
      userId: req.user?.id,
      userEmail: req.user?.email,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date(),
      details: {
        statusCode,
        success: isSuccess
      },
      severity: isSuccess ? 'low' : 'medium'
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware to log admin operations
export const logAdminOperation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const statusCode = res.statusCode;
    const isSuccess = statusCode >= 200 && statusCode < 300;
    
    if (req.user?.role === 'ADMIN') {
      logSecurityEvent({
        event: 'ADMIN_OPERATION',
        userId: req.user.id,
        userEmail: req.user.email,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date(),
        details: {
          statusCode,
          success: isSuccess,
          body: req.method !== 'GET' ? req.body : undefined
        },
        severity: 'medium'
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware to log suspicious activities
export const logSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection patterns
    /<script|javascript:|on\w+=/i, // XSS patterns
    /\.\.\//g, // Path traversal
    /\b(eval|exec|system|shell_exec)\b/i // Code injection
  ];
  
  const checkSuspicious = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };
  
  // Check query parameters
  const queryString = JSON.stringify(req.query);
  if (checkSuspicious(queryString)) {
    logSecurityEvent({
      event: 'SUSPICIOUS_QUERY',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date(),
      details: {
        query: req.query,
        suspiciousContent: queryString
      },
      severity: 'high'
    });
  }
  
  // Check request body
  if (req.body) {
    const bodyString = JSON.stringify(req.body);
    if (checkSuspicious(bodyString)) {
      logSecurityEvent({
        event: 'SUSPICIOUS_PAYLOAD',
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date(),
        details: {
          body: req.body,
          suspiciousContent: bodyString
        },
        severity: 'high'
      });
    }
  }
  
  next();
};

// Middleware to log failed authorization attempts
export const logAuthorizationFailure = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalStatus = res.status;
  
  res.status = function(code) {
    if (code === 403) {
      logSecurityEvent({
        event: 'AUTHORIZATION_FAILURE',
        userId: req.user?.id,
        userEmail: req.user?.email,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date(),
        details: {
          requiredRole: 'ADMIN', // This could be made dynamic
          userRole: req.user?.role
        },
        severity: 'medium'
      });
    }
    
    return originalStatus.call(this, code);
  };
  
  next();
};

export { securityLogger };