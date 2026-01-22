import { toast } from 'sonner';
import { IProductError, ProductError } from '@/types/product.unified';

export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Business logic errors
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  INVALID_PRICE = 'INVALID_PRICE',
  INVALID_STOCK_QUANTITY = 'INVALID_STOCK_QUANTITY',

  // Cache errors
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_MISS = 'CACHE_MISS',
  CACHE_INVALIDATION_FAILED = 'CACHE_INVALIDATION_FAILED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  component?: string;
  function?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableToast: boolean;
  enableReporting: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxRetries: number;
  retryDelay: number;
}

class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorLog: IProductError[] = [];
  private errorListeners: Array<(error: IProductError) => void> = [];

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableToast: true,
      enableReporting: false,
      logLevel: 'error',
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Handle different types of errors with appropriate user feedback
   */
  handleError(error: any, context: ErrorContext = {}): IProductError {
    const productError = this.normalizeError(error, context);

    // Log the error
    if (this.config.enableLogging) {
      this.logError(productError);
    }

    // Show user notification
    if (this.config.enableToast) {
      this.showNotification(productError);
    }

    // Report to external service if configured
    if (this.config.enableReporting) {
      this.reportError(productError);
    }

    // Notify listeners
    this.notifyListeners(productError);

    return productError;
  }

  /**
   * Normalize different error types to ProductError format
   */
  private normalizeError(error: any, context: ErrorContext): IProductError {
    const timestamp = new Date().toISOString();

    // If it's already a ProductError, return it
    if (this.isProductError(error)) {
      return { ...error, timestamp, context: context.component || context.function };
    }

    // Handle Supabase errors
    if (this.isSupabaseError(error)) {
      return this.handleSupabaseError(error, context, timestamp);
    }

    // Handle network errors
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error, context, timestamp);
    }

    // Handle validation errors
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, context, timestamp);
    }

    // Handle JavaScript errors
    if (error instanceof Error) {
      return this.handleJavaScriptError(error, context, timestamp);
    }

    // Handle unknown errors
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'An unexpected error occurred',
      details: error,
      timestamp,
      userId: context.userId,
      context: context.component || context.function
    };
  }

  /**
   * Handle Supabase-specific errors
   */
  private handleSupabaseError(error: any, context: ErrorContext, timestamp: string): IProductError {
    const { code, message, details } = error;

    let errorCode: ErrorCode;
    let userMessage: string;

    switch (code) {
      case 'PGRST116':
      case 'PGRST117':
        errorCode = ErrorCode.UNAUTHORIZED;
        userMessage = 'Authentication required. Please log in again.';
        break;
      case 'PGRST301':
        errorCode = ErrorCode.FORBIDDEN;
        userMessage = 'You don\'t have permission to perform this action.';
        break;
      case 'PGRST120':
      case 'PGRST121':
        errorCode = ErrorCode.QUERY_TIMEOUT;
        userMessage = 'The request took too long to process. Please try again.';
        break;
      case '23505':
        errorCode = ErrorCode.DUPLICATE_ENTRY;
        userMessage = 'This record already exists. Please check your data.';
        break;
      case '23503':
        errorCode = ErrorCode.FOREIGN_KEY_VIOLATION;
        userMessage = 'This action cannot be completed because it references other data.';
        break;
      case 'P0001':
        errorCode = ErrorCode.INSUFFICIENT_STOCK;
        userMessage = 'Insufficient stock quantity available.';
        break;
      default:
        if (code?.startsWith('23')) {
          errorCode = ErrorCode.DATABASE_ERROR;
          userMessage = 'Database constraint violation. Please check your data.';
        } else if (code?.startsWith('PGRST')) {
          errorCode = ErrorCode.DATABASE_ERROR;
          userMessage = 'Database error occurred. Please try again.';
        } else {
          errorCode = ErrorCode.DATABASE_ERROR;
          userMessage = 'An error occurred while processing your request.';
        }
    }

    return {
      code: errorCode,
      message: userMessage,
      details: { originalCode: code, originalMessage: message, details },
      timestamp,
      userId: context.userId,
      context: context.component || context.function
    };
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(error: any, context: ErrorContext, timestamp: string): IProductError {
    let errorCode: ErrorCode;
    let userMessage: string;

    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      errorCode = ErrorCode.NETWORK_ERROR;
      userMessage = 'Network connection failed. Please check your internet connection.';
    } else if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      errorCode = ErrorCode.TIMEOUT;
      userMessage = 'Request timed out. Please try again.';
    } else if (error.status === 429) {
      errorCode = ErrorCode.TOO_MANY_REQUESTS;
      userMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (error.status >= 500) {
      errorCode = ErrorCode.SERVER_ERROR;
      userMessage = 'Server error occurred. Please try again later.';
    } else if (error.status >= 400) {
      errorCode = ErrorCode.NETWORK_ERROR;
      userMessage = 'Request failed. Please check your input and try again.';
    } else {
      errorCode = ErrorCode.NETWORK_ERROR;
      userMessage = 'Network error occurred. Please try again.';
    }

    return {
      code: errorCode,
      message: userMessage,
      details: error,
      timestamp,
      userId: context.userId,
      context: context.component || context.function
    };
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(error: any, context: ErrorContext, timestamp: string): IProductError {
    let errorCode: ErrorCode;
    let userMessage: string;
    let field: string | undefined;

    if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
      errorCode = ErrorCode.VALIDATION_ERROR;
      userMessage = error.message || 'Validation failed. Please check your input.';
      field = error.field || error.path;
    } else if (error.name === 'ZodError') {
      errorCode = ErrorCode.VALIDATION_ERROR;
      userMessage = 'Invalid input format. Please check your data.';
      field = error.errors?.[0]?.path?.join('.');
    } else {
      errorCode = ErrorCode.INVALID_INPUT;
      userMessage = 'Invalid input provided.';
    }

    return {
      code: errorCode,
      message: userMessage,
      field,
      details: error,
      timestamp,
      userId: context.userId,
      context: context.component || context.function
    };
  }

  /**
   * Handle JavaScript errors
   */
  private handleJavaScriptError(error: Error, context: ErrorContext, timestamp: string): IProductError {
    let errorCode: ErrorCode;
    let userMessage: string;

    if (error.name === 'ReferenceError') {
      errorCode = ErrorCode.UNKNOWN_ERROR;
      userMessage = 'Application error occurred. Please refresh the page.';
    } else if (error.name === 'TypeError') {
      errorCode = ErrorCode.UNKNOWN_ERROR;
      userMessage = 'Application error occurred. Please try again.';
    } else if (error.name === 'RangeError') {
      errorCode = ErrorCode.INVALID_INPUT;
      userMessage = 'Invalid value provided.';
    } else {
      errorCode = ErrorCode.UNEXPECTED_ERROR;
      userMessage = 'An unexpected error occurred.';
    }

    return {
      code: errorCode,
      message: userMessage,
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp,
      userId: context.userId,
      context: context.component || context.function
    };
  }

  /**
   * Check if error is already a ProductError
   */
  private isProductError(error: any): error is ProductError {
    return error && typeof error === 'object' && 'code' in error && 'message' in error && 'timestamp' in error;
  }

  /**
   * Check if error is a Supabase error
   */
  private isSupabaseError(error: any): boolean {
    return error && (
      error.code?.startsWith('PGRST') ||
      error.code?.startsWith('23') ||
      error.code === 'P0001' ||
      (error.message && error.message.includes('PostgREST'))
    );
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    return error && (
      error.name === 'TypeError' ||
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.status !== undefined ||
      (error.message && (
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('timeout')
      ))
    );
  }

  /**
   * Check if error is a validation error
   */
  private isValidationError(error: any): boolean {
    return error && (
      error.name === 'ValidationError' ||
      error.name === 'ZodError' ||
      error.code === 'VALIDATION_ERROR' ||
      (error.message && error.message.includes('validation'))
    );
  }

  /**
   * Log error to console and storage
   */
  private logError(error: IProductError): void {
    const severity = this.getErrorSeverity(error.code as ErrorCode);
    const logMessage = `[${error.timestamp}] [${error.code}] [${severity}] ${error.message}`;

    switch (severity) {
      case ErrorSeverity.LOW:
        console.debug(logMessage, error);
        break;
      case ErrorSeverity.MEDIUM:
        console.info(logMessage, error);
        break;
      case ErrorSeverity.HIGH:
        console.warn(logMessage, error);
        break;
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, error);
        break;
    }

    // Store in error log (keep last 100 errors)
    this.errorLog.push(error);
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  /**
   * Show user-friendly notification
   */
  private showNotification(error: IProductError): void {
    const severity = this.getErrorSeverity(error.code as ErrorCode);

    switch (severity) {
      case ErrorSeverity.LOW:
      case ErrorSeverity.MEDIUM:
        toast.info(error.message, {
          description: error.context,
          duration: 4000,
        });
        break;
      case ErrorSeverity.HIGH:
        toast.warning(error.message, {
          description: error.context,
          duration: 5000,
          action: {
            label: 'Details',
            onClick: () => this.showErrorDetails(error)
          }
        });
        break;
      case ErrorSeverity.CRITICAL:
        toast.error(error.message, {
          description: error.context,
          duration: 6000,
          action: {
            label: 'Report',
            onClick: () => this.reportError(error)
          }
        });
        break;
    }
  }

  /**
   * Get error severity based on error code
   */
  private getErrorSeverity(errorCode: ErrorCode): ErrorSeverity {
    const severityMap: Record<ErrorCode, ErrorSeverity> = {
      [ErrorCode.UNAUTHORIZED]: ErrorSeverity.HIGH,
      [ErrorCode.FORBIDDEN]: ErrorSeverity.HIGH,
      [ErrorCode.TOKEN_EXPIRED]: ErrorSeverity.MEDIUM,
      [ErrorCode.INVALID_TOKEN]: ErrorSeverity.HIGH,
      [ErrorCode.VALIDATION_ERROR]: ErrorSeverity.LOW,
      [ErrorCode.INVALID_INPUT]: ErrorSeverity.LOW,
      [ErrorCode.REQUIRED_FIELD_MISSING]: ErrorSeverity.LOW,
      [ErrorCode.INVALID_FORMAT]: ErrorSeverity.LOW,
      [ErrorCode.DATABASE_ERROR]: ErrorSeverity.CRITICAL,
      [ErrorCode.CONNECTION_FAILED]: ErrorSeverity.HIGH,
      [ErrorCode.QUERY_TIMEOUT]: ErrorSeverity.MEDIUM,
      [ErrorCode.DUPLICATE_ENTRY]: ErrorSeverity.LOW,
      [ErrorCode.FOREIGN_KEY_VIOLATION]: ErrorSeverity.MEDIUM,
      [ErrorCode.NETWORK_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorCode.TIMEOUT]: ErrorSeverity.MEDIUM,
      [ErrorCode.SERVER_ERROR]: ErrorSeverity.CRITICAL,
      [ErrorCode.SERVICE_UNAVAILABLE]: ErrorSeverity.HIGH,
      [ErrorCode.INSUFFICIENT_STOCK]: ErrorSeverity.LOW,
      [ErrorCode.PRODUCT_NOT_FOUND]: ErrorSeverity.LOW,
      [ErrorCode.CATEGORY_NOT_FOUND]: ErrorSeverity.LOW,
      [ErrorCode.INVALID_PRICE]: ErrorSeverity.LOW,
      [ErrorCode.INVALID_STOCK_QUANTITY]: ErrorSeverity.LOW,
      [ErrorCode.CACHE_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorCode.CACHE_MISS]: ErrorSeverity.LOW,
      [ErrorCode.CACHE_INVALIDATION_FAILED]: ErrorSeverity.MEDIUM,
      [ErrorCode.RATE_LIMIT_EXCEEDED]: ErrorSeverity.MEDIUM,
      [ErrorCode.TOO_MANY_REQUESTS]: ErrorSeverity.MEDIUM,
      [ErrorCode.UNKNOWN_ERROR]: ErrorSeverity.CRITICAL,
      [ErrorCode.UNEXPECTED_ERROR]: ErrorSeverity.CRITICAL
    };

    return severityMap[errorCode] || ErrorSeverity.CRITICAL;
  }

  /**
   * Show detailed error information (for development)
   */
  private showErrorDetails(error: IProductError): void {
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Details');
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Field:', error.field);
      console.error('Context:', error.context);
      console.error('Details:', error.details);
      console.error('User ID:', error.userId);
      console.error('Timestamp:', error.timestamp);
      console.groupEnd();
    }
  }

  /**
   * Report error to external service
   */
  private async reportError(error: IProductError): Promise<void> {
    try {
      // In a real application, you would send this to an error reporting service
      // like Sentry, Bugsnag, or your own error tracking API
      console.log('Reporting error to external service:', error);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  /**
   * Add error listener
   */
  addErrorListener(listener: (error: IProductError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener: (error: IProductError) => void): void {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  /**
   * Notify all error listeners
   */
  private notifyListeners(error: IProductError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): IProductError[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {},
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries - 1) {
          throw this.handleError(error, { ...context, function: 'retryWithBackoff' });
        }

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw this.handleError(lastError, context);
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler({
  enableLogging: true,
  enableToast: true,
  enableReporting: process.env.NODE_ENV === 'production',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error'
});

// Export singleton and types
export { errorHandler };
export default errorHandler;
