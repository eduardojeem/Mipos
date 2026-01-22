type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  namespace?: string;
  enabled?: boolean;
}

class Logger {
  private namespace: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.namespace = options.namespace || 'app';
    this.enabled = options.enabled ?? true;
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
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.debug(...this.formatMessage('debug', message, ...args));
  }

  info(message: any, ...args: any[]) {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.info(...this.formatMessage('info', message, ...args));
  }

  warn(message: any, ...args: any[]) {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.warn(...this.formatMessage('warn', message, ...args));
  }

  error(message: any, ...args: any[]) {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.error(...this.formatMessage('error', message, ...args));
  }
}

export const logger = new Logger({ namespace: 'frontend' });
export const createLogger = (namespace: string, enabled = true) => new Logger({ namespace, enabled });