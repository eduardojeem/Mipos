/**
 * Secure Logger
 * Logger que sanitiza información sensible en producción
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogMetadata {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component?: string;
  action?: string;
  message: string;
  metadata?: LogMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Campos sensibles que deben ser sanitizados
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'session',
  'ssn',
  'credit_card',
  'creditCard',
  'cvv',
  'pin',
];

/**
 * Campos que contienen PII (Personally Identifiable Information)
 */
const PII_FIELDS = [
  'email',
  'phone',
  'address',
  'ip',
  'userId',
  'user_id',
  'name',
  'full_name',
  'firstName',
  'first_name',
  'lastName',
  'last_name',
];

/**
 * Sanitiza un valor sensible
 */
function sanitizeValue(value: unknown, fieldName: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  const lowerFieldName = fieldName.toLowerCase();
  
  // Sanitizar campos sensibles completamente
  if (SENSITIVE_FIELDS.some(field => lowerFieldName.includes(field.toLowerCase()))) {
    return '[REDACTED]';
  }
  
  // En producción, sanitizar PII
  if (process.env.NODE_ENV === 'production') {
    if (PII_FIELDS.some(field => lowerFieldName.includes(field.toLowerCase()))) {
      if (typeof value === 'string') {
        // Mostrar solo primeros y últimos caracteres
        if (lowerFieldName.includes('email')) {
          const parts = value.split('@');
          if (parts.length === 2) {
            const username = parts[0];
            const domain = parts[1];
            return `${username.charAt(0)}***@${domain}`;
          }
        }
        
        if (value.length > 4) {
          return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
        }
        
        return '***';
      }
    }
  }
  
  return value;
}

/**
 * Sanitiza un objeto recursivamente
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = sanitizeValue(value, key);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Formatea un log entry para consola
 */
function formatForConsole(entry: LogEntry): string {
  const emoji = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
  }[entry.level];
  
  let output = `${emoji} [${entry.timestamp}]`;
  
  if (entry.component) {
    output += ` [${entry.component}]`;
  }
  
  if (entry.action) {
    output += ` ${entry.action}:`;
  }
  
  output += ` ${entry.message}`;
  
  return output;
}

/**
 * Determina si se debe loguear según el nivel
 */
function shouldLog(level: LogLevel): boolean {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'success'];
  const currentLevelIndex = levels.indexOf(logLevel as LogLevel);
  const messageLevelIndex = levels.indexOf(level);
  
  return messageLevelIndex >= currentLevelIndex;
}

/**
 * Clase SecureLogger
 */
class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  
  /**
   * Log genérico
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): void {
    if (!shouldLog(level)) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: metadata ? sanitizeObject(metadata) as LogMetadata : undefined,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      } : undefined,
    };
    
    // En desarrollo, usar console con colores
    if (this.isDevelopment) {
      const consoleMethod = level === 'error' ? console.error : 
                           level === 'warn' ? console.warn : 
                           console.log;
      
      consoleMethod(formatForConsole(entry));
      
      if (entry.metadata) {
        console.log('Metadata:', entry.metadata);
      }
      
      if (entry.error?.stack) {
        console.error(entry.error.stack);
      }
    } else {
      // En producción, usar JSON estructurado
      console.log(JSON.stringify(entry));
    }
  }
  
  /**
   * Log de debug (solo en desarrollo)
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (this.isDevelopment) {
      this.log('debug', message, metadata);
    }
  }
  
  /**
   * Log informativo
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }
  
  /**
   * Log de advertencia
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }
  
  /**
   * Log de error
   */
  error(message: string, error?: Error, metadata?: LogMetadata): void {
    this.log('error', message, metadata, error);
  }
  
  /**
   * Log de éxito
   */
  success(message: string, metadata?: LogMetadata): void {
    this.log('success', message, metadata);
  }
  
  /**
   * Crea un logger con contexto
   */
  withContext(component: string, action?: string) {
    return {
      debug: (message: string, metadata?: LogMetadata) => 
        this.debug(message, { component, action, ...metadata }),
      info: (message: string, metadata?: LogMetadata) => 
        this.info(message, { component, action, ...metadata }),
      warn: (message: string, metadata?: LogMetadata) => 
        this.warn(message, { component, action, ...metadata }),
      error: (message: string, error?: Error, metadata?: LogMetadata) => 
        this.error(message, error, { component, action, ...metadata }),
      success: (message: string, metadata?: LogMetadata) => 
        this.success(message, { component, action, ...metadata }),
    };
  }
}

/**
 * Instancia global del logger
 */
export const secureLogger = new SecureLogger();

/**
 * Helper para loguear peticiones HTTP
 */
export function logRequest(
  method: string,
  url: string,
  metadata?: LogMetadata
): void {
  secureLogger.info(`${method} ${url}`, {
    method,
    url: sanitizeObject(url),
    ...metadata,
  });
}

/**
 * Helper para loguear respuestas HTTP
 */
export function logResponse(
  method: string,
  url: string,
  status: number,
  duration: number,
  metadata?: LogMetadata
): void {
  const level = status >= 500 ? 'error' : 
                status >= 400 ? 'warn' : 
                'info';
  
  const message = `${method} ${url} - ${status} (${duration}ms)`;
  
  if (level === 'error') {
    secureLogger.error(message, undefined, { method, url, status, duration, ...metadata });
  } else if (level === 'warn') {
    secureLogger.warn(message, { method, url, status, duration, ...metadata });
  } else {
    secureLogger.info(message, { method, url, status, duration, ...metadata });
  }
}

/**
 * Helper para loguear operaciones de base de datos
 */
export function logDatabaseOperation(
  operation: string,
  table: string,
  duration: number,
  metadata?: LogMetadata
): void {
  secureLogger.debug(`DB ${operation} on ${table} (${duration}ms)`, {
    operation,
    table,
    duration,
    ...metadata,
  });
}

export default secureLogger;
