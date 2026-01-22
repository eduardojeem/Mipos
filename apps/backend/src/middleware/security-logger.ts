import { Request, Response, NextFunction } from 'express';
import { EnhancedAuthenticatedRequest } from './enhanced-auth';

// Security event types for comprehensive logging
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  LOGOUT_FORCE = 'LOGOUT_FORCE',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Authorization events
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_ESCALATION_ATTEMPT = 'ROLE_ESCALATION_ATTEMPT',
  
  // Data access events
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  BULK_DATA_EXPORT = 'BULK_DATA_EXPORT',
  ADMIN_ACTION = 'ADMIN_ACTION',
  
  // Security violations
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Critical operations
  USER_CREATED = 'USER_CREATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REVOKED = 'ROLE_REVOKED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // System events
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED'
}

// Security log entry interface
export interface SecurityLogEntry {
  timestamp: Date;
  eventType: SecurityEventType;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  success: boolean;
  details?: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sessionId?: string;
}

class SecurityLogger {
  private logs: SecurityLogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory
  
  /**
   * Log a security event
   */
  log(entry: Omit<SecurityLogEntry, 'timestamp'>): void {
    const logEntry: SecurityLogEntry = {
      ...entry,
      timestamp: new Date()
    };
    
    // Add to in-memory logs
    this.logs.push(logEntry);
    
    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console logging with appropriate level
    this.consoleLog(logEntry);
    
    // In production, you would also:
    // - Send to external logging service (e.g., Winston, Sentry)
    // - Store in database for long-term audit
    // - Send alerts for critical events
  }
  
  /**
   * Log authentication events
   */
  logAuth(
    eventType: SecurityEventType.LOGIN_SUCCESS | SecurityEventType.LOGIN_FAILURE | SecurityEventType.LOGOUT | SecurityEventType.LOGOUT_FORCE,
    req: Request,
    userId?: string,
    userEmail?: string,
    details?: Record<string, any>
  ): void {
    this.log({
      eventType,
      userId,
      userEmail,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      success: eventType === SecurityEventType.LOGIN_SUCCESS,
      riskLevel: eventType === SecurityEventType.LOGIN_FAILURE ? 'MEDIUM' : 'LOW',
      details
    });
  }
  
  /**
   * Log permission checks
   */
  logPermission(
    granted: boolean,
    req: EnhancedAuthenticatedRequest,
    resource: string,
    action: string,
    details?: Record<string, any>
  ): void {
    const eventType = granted ? SecurityEventType.PERMISSION_GRANTED : SecurityEventType.PERMISSION_DENIED;
    
    const userRolesStr = req.user?.roles?.map(r => r.name).join(', ') || undefined;
    this.log({
      eventType,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: userRolesStr,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      resource,
      action,
      success: granted,
      riskLevel: granted ? 'LOW' : 'MEDIUM',
      sessionId: (req as any).sessionID,
      details
    });
  }
  
  /**
   * Log critical operations
   */
  logCriticalOperation(
    eventType: SecurityEventType,
    req: EnhancedAuthenticatedRequest,
    success: boolean,
    details?: Record<string, any>
  ): void {
    const userRolesStr = req.user?.roles?.map(r => r.name).join(', ') || undefined;
    this.log({
      eventType,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: userRolesStr,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      success,
      riskLevel: 'HIGH',
      sessionId: (req as any).sessionID,
      details
    });
  }
  
  /**
   * Log rate limiting events
   */
  logRateLimit(req: Request, details?: Record<string, any>): void {
    this.log({
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      success: false,
      riskLevel: 'MEDIUM',
      details: {
        endpoint: req.path,
        method: req.method,
        ...details
      }
    });
  }
  
  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    req: Request | EnhancedAuthenticatedRequest,
    reason: string,
    details?: Record<string, any>
  ): void {
    const enhancedReq = req as EnhancedAuthenticatedRequest;
    
    this.log({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId: enhancedReq.user?.id,
      userEmail: enhancedReq.user?.email,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      success: false,
      riskLevel: 'HIGH',
      details: {
        reason,
        endpoint: req.path,
        method: req.method,
        ...details
      }
    });
  }
  
  /**
   * Get security logs with filtering
   */
  getLogs(filter?: {
    eventType?: SecurityEventType;
    userId?: string;
    riskLevel?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): SecurityLogEntry[] {
    let filteredLogs = [...this.logs];
    
    if (filter) {
      if (filter.eventType) {
        filteredLogs = filteredLogs.filter(log => log.eventType === filter.eventType);
      }
      
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
      }
      
      if (filter.riskLevel) {
        filteredLogs = filteredLogs.filter(log => log.riskLevel === filter.riskLevel);
      }
      
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }
      
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }
      
      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }
    
    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get security statistics
   */
  getStats(timeframe?: { startDate: Date; endDate: Date }) {
    let logs = this.logs;
    
    if (timeframe) {
      logs = logs.filter(log => 
        log.timestamp >= timeframe.startDate && 
        log.timestamp <= timeframe.endDate
      );
    }
    
    const stats = {
      totalEvents: logs.length,
      eventsByType: {} as Record<string, number>,
      eventsByRiskLevel: {} as Record<string, number>,
      failedEvents: logs.filter(log => !log.success).length,
      suspiciousActivities: logs.filter(log => log.eventType === SecurityEventType.SUSPICIOUS_ACTIVITY).length,
      rateLimitExceeded: logs.filter(log => log.eventType === SecurityEventType.RATE_LIMIT_EXCEEDED).length,
      uniqueUsers: new Set(logs.map(log => log.userId).filter(Boolean)).size,
      uniqueIPs: new Set(logs.map(log => log.ipAddress).filter(Boolean)).size
    };
    
    // Count events by type
    logs.forEach(log => {
      stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;
      stats.eventsByRiskLevel[log.riskLevel] = (stats.eventsByRiskLevel[log.riskLevel] || 0) + 1;
    });
    
    return stats;
  }
  
  /**
   * Extract client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      'unknown'
    );
  }
  
  /**
   * Console logging with appropriate levels
   */
  private consoleLog(entry: SecurityLogEntry): void {
    const logMessage = `[SECURITY] ${entry.timestamp.toISOString()} - ${entry.eventType} - ${entry.riskLevel}`;
    const logData = {
      userId: entry.userId,
      userEmail: entry.userEmail,
      ipAddress: entry.ipAddress,
      resource: entry.resource,
      action: entry.action,
      success: entry.success,
      details: entry.details
    };
    
    switch (entry.riskLevel) {
      case 'CRITICAL':
        console.error(logMessage, logData);
        break;
      case 'HIGH':
        console.warn(logMessage, logData);
        break;
      case 'MEDIUM':
        console.info(logMessage, logData);
        break;
      case 'LOW':
      default:
        console.log(logMessage, logData);
        break;
    }
  }
}

// Singleton instance
export const securityLogger = new SecurityLogger();

/**
 * Middleware to automatically log request details
 */
export const securityLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(this: Response, chunk?: any, encoding?: any) {
    // Log based on response status
    if (res.statusCode >= 400) {
      const enhancedReq = req as EnhancedAuthenticatedRequest;
      
      if (res.statusCode === 401) {
        securityLogger.log({
          eventType: SecurityEventType.INVALID_TOKEN,
          userId: enhancedReq.user?.id,
          ipAddress: securityLogger['getClientIP'](req),
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          success: false,
          riskLevel: 'MEDIUM',
          details: { statusCode: res.statusCode }
        });
      } else if (res.statusCode === 403) {
        securityLogger.logPermission(false, enhancedReq, req.path, req.method, {
          statusCode: res.statusCode
        });
      } else if (res.statusCode === 429) {
        securityLogger.logRateLimit(req, { statusCode: res.statusCode });
      }
    }
    
    // Call original end function and return Response to satisfy types
    originalEnd.call(this, chunk, encoding as any);
    return this;
  };
  
  next();
};

export default securityLogger;