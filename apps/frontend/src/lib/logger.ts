type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  namespace?: string;
  enabled?: boolean;
}

const isDevelopment = process.env.NODE_ENV === 'development';

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

  private formatMessage(level: LogLevel, message: any, ...args: any[]) {
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

  debug(message: any, ...args: any[]) {
    if (!this.shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.debug(...this.formatMessage('debug', message, ...args));
  }

  info(message: any, ...args: any[]) {
    if (!this.shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.info(...this.formatMessage('info', message, ...args));
  }

  warn(message: any, ...args: any[]) {
    if (!this.shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn(...this.formatMessage('warn', message, ...args));
  }

  error(message: any, ...args: any[]) {
    if (!this.shouldLog('error')) return;
    // eslint-disable-next-line no-console
    console.error(...this.formatMessage('error', message, ...args));
  }

  /**
   * Simple log method for backwards compatibility
   * Only logs in development
   */
  log(message: any, ...args: any[]) {
    if (!isDevelopment || !this.enabled) return;
    // eslint-disable-next-line no-console
    console.log(...this.formatMessage('info', message, ...args));
  }
}

export const logger = new Logger({ namespace: 'frontend' });
export const createLogger = (namespace: string, enabled = true) => new Logger({ namespace, enabled });