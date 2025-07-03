export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private static logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
  private static logFormat: string = process.env.LOG_FORMAT || 'json';

  private static shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const targetLevelIndex = levels.indexOf(level);
    return targetLevelIndex >= currentLevelIndex;
  }

  private static formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string | object {
    const timestamp = new Date().toISOString();
    
    if (this.logFormat === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...context,
      });
    }
    
    // Pretty format for development
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  static debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  static info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  static warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  static error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext: LogContext = { ...context };
      
      if (error instanceof Error) {
        errorContext.error = {
          message: error.message,
          stack: error.stack,
          name: error.name,
        };
      } else if (error) {
        errorContext.error = String(error);
      }
      
      console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
    }
  }

  static child(defaultContext: LogContext): LoggerInstance {
    return new LoggerInstance(defaultContext);
  }
}

// Logger instance with default context
export class LoggerInstance {
  constructor(private defaultContext: LogContext) {}

  debug(message: string, context?: LogContext): void {
    Logger.debug(message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: LogContext): void {
    Logger.info(message, { ...this.defaultContext, ...context });
  }

  warn(message: string, context?: LogContext): void {
    Logger.warn(message, { ...this.defaultContext, ...context });
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    Logger.error(message, error, { ...this.defaultContext, ...context });
  }

  child(additionalContext: LogContext): LoggerInstance {
    return new LoggerInstance({ ...this.defaultContext, ...additionalContext });
  }
}