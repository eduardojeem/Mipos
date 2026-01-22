import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Logger Levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Log Entry Interface
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  requestId?: string;
}

/**
 * Logger Configuration
 */
interface LoggerConfig {
  logToFile: boolean;
  logToConsole: boolean;
  logLevel: LogLevel;
  logDirectory: string;
  maxFileSize: number; // in MB
  maxFiles: number;
}

/**
 * Default Logger Configuration
 */
const defaultConfig: LoggerConfig = {
  logToFile: process.env.NODE_ENV === 'production',
  logToConsole: true,
  logLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  logDirectory: path.join(process.cwd(), 'logs'),
  maxFileSize: 10, // 10MB
  maxFiles: 5
};

/**
 * Logger Class
 */
class Logger {
  private config: LoggerConfig;
  private logFiles: Map<LogLevel, string> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.initializeLogFiles();
  }

  /**
   * Initialize log files
   */
  private initializeLogFiles(): void {
    if (!this.config.logToFile) return;

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }

    // Initialize log files for each level
    Object.values(LogLevel).forEach(level => {
      const fileName = `${level}-${new Date().toISOString().split('T')[0]}.log`;
      const filePath = path.join(this.config.logDirectory, fileName);
      this.logFiles.set(level, filePath);
    });
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= configLevelIndex;
  }

  /**
   * Format log entry
   */
  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, data, userId, ip, path, method, statusCode, duration, requestId } = entry;
    
    let logLine = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (requestId) logLine += ` [${requestId}]`;
    if (userId) logLine += ` [User: ${userId}]`;
    if (ip) logLine += ` [IP: ${ip}]`;
    if (method && path) logLine += ` [${method} ${path}]`;
    if (statusCode) logLine += ` [${statusCode}]`;
    if (duration) logLine += ` [${duration}ms]`;
    
    logLine += ` ${message}`;
    
    if (data) {
      logLine += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
    
    return logLine;
  }

  /**
   * Write to file
   */
  private writeToFile(level: LogLevel, entry: LogEntry): void {
    if (!this.config.logToFile) return;

    const filePath = this.logFiles.get(level);
    if (!filePath) return;

    const logLine = this.formatLogEntry(entry) + '\n';

    try {
      // Check file size and rotate if necessary
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const fileSizeMB = stats.size / (1024 * 1024);
        
        if (fileSizeMB > this.config.maxFileSize) {
          this.rotateLogFile(level, filePath);
        }
      }

      fs.appendFileSync(filePath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log file
   */
  private rotateLogFile(level: LogLevel, filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      const baseName = path.basename(filePath, '.log');
      
      // Move existing files
      for (let i = this.config.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}.log`);
        const newFile = path.join(dir, `${baseName}.${i + 1}.log`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Move current file to .1
      const rotatedFile = path.join(dir, `${baseName}.1.log`);
      fs.renameSync(filePath, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Log message
   */
  private log(level: LogLevel, message: string, data?: any, context?: Partial<LogEntry>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      ...context
    };

    // Console output
    if (this.config.logToConsole) {
      const formattedMessage = this.formatLogEntry(entry);
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.log(formattedMessage);
          break;
      }
    }

    // File output
    this.writeToFile(level, entry);
  }

  /**
   * Public logging methods
   */
  error(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  warn(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  info(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  debug(message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const incomingRequestId = (req.headers['x-request-id'] as string | undefined);
  const requestId = (incomingRequestId && incomingRequestId.trim()) ? incomingRequestId.trim() : Math.random().toString(36).substring(7);
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  // Expose request ID in response headers for client-side tracing
  res.setHeader('X-Request-Id', requestId);
  
  // Log request start
  logger.info('Request started', {
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent']
  }, {
    requestId,
    ip: req.ip,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id
  });

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  (res as any).end = function(this: Response, chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      statusCode: res.statusCode,
      duration: `${duration}ms`
    }, {
      requestId,
      ip: req.ip,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.id
    });
    
    return originalEnd(chunk, encoding as any);
  };

  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req as any).requestId;
  
  logger.error('Request error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query
  }, {
    requestId,
    ip: req.ip,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id
  });

  next(error);
};

/**
 * Security event logger
 */
export const logSecurityEvent = (
  event: string, 
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: any,
  req?: Request
): void => {
  const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
  
  const logFn = level === LogLevel.ERROR ? logger.error.bind(logger) : logger.warn.bind(logger);
  logFn(`Security Event: ${event}`, {
    severity,
    details,
    timestamp: new Date().toISOString()
  }, req ? {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id
  } : undefined);
};

/**
 * Performance logger
 */
export const logPerformance = (
  operation: string,
  duration: number,
  details?: any,
  req?: Request
): void => {
  const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
  
  const logFn = level === LogLevel.WARN ? logger.warn.bind(logger) : logger.info.bind(logger);
  logFn(`Performance: ${operation}`, {
    duration: `${duration}ms`,
    details
  }, req ? {
    requestId: (req as any).requestId,
    userId: (req as any).user?.id
  } : undefined);
};

export default logger;