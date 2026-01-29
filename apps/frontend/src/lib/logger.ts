type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  namespace?: string;
  enabled?: boolean;
}

interface LogContext {
  component: string;
  action: string;
  metadata?: Record<string, unknown>;
}

const isDevelopment = process.env.NODE_ENV === 'development';

// Emoji prefixes for easy log filtering
const LOG_PREFIXES = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  success: '✅',
} as const;

class Logger {
  private namespace: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.namespace = options.namespace || 'app';
    this.enabled = options.enabled ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    // Always allow errors in production for monitoring
    if (level === 'error') return this.enabled;
    // Other levels only in development
    return this.enabled && isDevelopment;
  }

  private formatMessage(level: LogLevel, message: unknown, ...args: unknown[]) {
    const time = new Date().toISOString();
    const prefix = `[${time}] [${this.namespace}] [${level.toUpperCase()}]`;
    const normalized = args.map((a) => {
      if (a instanceof Error) {
        return { name: a.name, message: a.message, stack: a.stack };
      }
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    });
    return [prefix, typeof message === 'string' ? message : String(message), ...normalized];
  }

  debug(message: unknown, ...args: unknown[]) {
    if (!this.shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.debug(...this.formatMessage('debug', message, ...args));
  }

  info(message: unknown, ...args: unknown[]) {
    if (!this.shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.info(...this.formatMessage('info', message, ...args));
  }

  warn(message: unknown, ...args: unknown[]) {
    if (!this.shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn(...this.formatMessage('warn', message, ...args));
  }

  error(message: unknown, ...args: unknown[]) {
    if (!this.shouldLog('error')) return;
    // eslint-disable-next-line no-console
    console.error(...this.formatMessage('error', message, ...args));
  }

  /**
   * Simple log method for backwards compatibility
   * Only logs in development
   */
  log(message: unknown, ...args: unknown[]) {
    if (!isDevelopment || !this.enabled) return;
    // eslint-disable-next-line no-console
    console.log(...this.formatMessage('info', message, ...args));
  }
}

/**
 * StructuredLogger provides consistent, structured logging with emoji prefixes
 * for easy filtering and debugging. Designed for the error handling system.
 * 
 * Features:
 * - Consistent emoji prefixes (🔍, ✅, ❌, ⚠️) for log filtering
 * - Structured context with component, action, and metadata
 * - Automatic error serialization with stack traces
 * - Development/production mode awareness
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.6
 */
export class StructuredLogger {
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    // Always allow errors in production for monitoring
    if (level === 'error') return this.enabled;
    // Other levels only in development or test
    return this.enabled && (isDevelopment || process.env.NODE_ENV === 'test');
  }

  /**
   * Log informational messages with 🔍 prefix
   * Use for request starts, state changes, and general flow tracking
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;

    const prefix = LOG_PREFIXES.debug;
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `[${context.action}]` : '';
    
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${component}${action} ${message}`, context?.metadata || '');
  }

  /**
   * Log success messages with ✅ prefix
   * Use for successful operations, completed requests, and positive outcomes
   */
  success(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;

    const prefix = LOG_PREFIXES.success;
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `[${context.action}]` : '';
    
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${component}${action} ${message}`, context?.metadata || '');
  }

  /**
   * Log warning messages with ⚠️ prefix
   * Use for non-critical issues, deprecations, and potential problems
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;

    const prefix = LOG_PREFIXES.warn;
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `[${context.action}]` : '';
    
    // eslint-disable-next-line no-console
    console.warn(`${prefix} ${component}${action} ${message}`, context?.metadata || '');
  }

  /**
   * Log error messages with ❌ prefix
   * Use for failures, exceptions, and critical issues
   * Automatically serializes Error objects with stack traces
   */
  error(message: string, error: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return;

    const prefix = LOG_PREFIXES.error;
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `[${context.action}]` : '';
    
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context?.metadata,
    };
    
    // eslint-disable-next-line no-console
    console.error(`${prefix} ${component}${action} ${message}`, errorDetails);
  }

  /**
   * Log debug messages with 🔍 prefix
   * Use for detailed debugging information
   * Only logs in development mode
   */
  debug(message: string, context?: LogContext): void {
    if (!this.enabled || (!isDevelopment && process.env.NODE_ENV !== 'test')) return;

    const prefix = LOG_PREFIXES.debug;
    const component = context?.component ? `[${context.component}]` : '';
    const action = context?.action ? `[${context.action}]` : '';
    
    // eslint-disable-next-line no-console
    console.debug(`${prefix} ${component}${action} ${message}`, context?.metadata || '');
  }
}

export const logger = new Logger({ namespace: 'frontend' });
export const createLogger = (namespace: string, enabled = true) => new Logger({ namespace, enabled });

// Export a default structured logger instance for the error handling system
export const structuredLogger = new StructuredLogger();