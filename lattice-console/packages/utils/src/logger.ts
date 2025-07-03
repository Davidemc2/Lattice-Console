import winston from 'winston';

export interface LogContext {
  service?: string;
  userId?: string;
  agentId?: string;
  workloadId?: string;
  requestId?: string;
  [key: string]: any;
}

class LoggerClass {
  private winston: winston.Logger;

  constructor() {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const logObject = {
            timestamp,
            level,
            message,
            service: service || 'lattice-console',
            ...meta,
          };
          return JSON.stringify(logObject);
        })
      ),
      defaultMeta: {
        service: 'lattice-console',
        environment: process.env.NODE_ENV || 'development',
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      this.winston.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        })
      );
      this.winston.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
        })
      );
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): LoggerInstance {
    return new LoggerInstance(this.winston.child(context));
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: any, context?: LogContext): void {
    this.winston.info(message, { ...meta, ...context });
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: any, context?: LogContext): void {
    this.winston.warn(message, { ...meta, ...context });
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorInfo = error instanceof Error 
      ? { 
          error: error.message, 
          stack: error.stack,
          name: error.name 
        }
      : { error };
    
    this.winston.error(message, { ...errorInfo, ...context });
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: any, context?: LogContext): void {
    this.winston.debug(message, { ...meta, ...context });
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, meta?: any, context?: LogContext): void {
    this.winston.verbose(message, { ...meta, ...context });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.winston.info(`Performance: ${operation}`, {
      operation,
      duration_ms: duration,
      type: 'performance',
      ...context,
    });
  }

  /**
   * Log audit events
   */
  audit(action: string, resource?: string, resourceId?: string, context?: LogContext): void {
    this.winston.info(`Audit: ${action}`, {
      action,
      resource,
      resourceId,
      type: 'audit',
      ...context,
    });
  }

  /**
   * Log security events
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    this.winston.warn(`Security: ${event}`, {
      event,
      severity,
      type: 'security',
      ...context,
    });
  }

  /**
   * Time a function execution
   */
  async time<T>(operation: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${operation}`, context);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.performance(operation, duration, context);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed: ${operation}`, error, { ...context, duration_ms: duration });
      throw error;
    }
  }
}

class LoggerInstance {
  constructor(private winston: winston.Logger) {}

  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  error(message: string, error?: Error | any): void {
    const errorInfo = error instanceof Error 
      ? { 
          error: error.message, 
          stack: error.stack,
          name: error.name 
        }
      : { error };
    
    this.winston.error(message, errorInfo);
  }

  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.winston.verbose(message, meta);
  }

  performance(operation: string, duration: number): void {
    this.winston.info(`Performance: ${operation}`, {
      operation,
      duration_ms: duration,
      type: 'performance',
    });
  }

  audit(action: string, resource?: string, resourceId?: string): void {
    this.winston.info(`Audit: ${action}`, {
      action,
      resource,
      resourceId,
      type: 'audit',
    });
  }

  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.winston.warn(`Security: ${event}`, {
      event,
      severity,
      type: 'security',
    });
  }

  async time<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${operation}`);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.performance(operation, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed: ${operation}`, { error, duration_ms: duration });
      throw error;
    }
  }

  child(context: LogContext): LoggerInstance {
    return new LoggerInstance(this.winston.child(context));
  }
}

export const Logger = new LoggerClass();
export type { LoggerInstance };