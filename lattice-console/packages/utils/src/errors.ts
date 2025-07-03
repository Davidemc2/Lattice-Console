export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // Agent errors
  AGENT_OFFLINE = 'AGENT_OFFLINE',
  DOCKER_ERROR = 'DOCKER_ERROR',
  PORT_CONFLICT = 'PORT_CONFLICT',
  VOLUME_ERROR = 'VOLUME_ERROR',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    // Capture stack trace for V8 engines
    if ('captureStackTrace' in Error) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(code, message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.ALREADY_EXISTS, message, 409, details);
    this.name = 'ConflictError';
  }
}

export class DockerError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.DOCKER_ERROR, message, 500, details);
    this.name = 'DockerError';
  }
}

export class AgentError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.AGENT_OFFLINE) {
    super(code, message, 503);
    this.name = 'AgentError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.DATABASE_ERROR, message, 500, details);
    this.name = 'DatabaseError';
  }
}

// Error handler utility
export class ErrorHandler {
  static handle(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('connect ECONNREFUSED')) {
        return new AppError(ErrorCode.CONNECTION_ERROR, 'Service connection failed', 503);
      }
      
      if (error.message.includes('timeout')) {
        return new AppError(ErrorCode.TIMEOUT, 'Operation timed out', 504);
      }

      // Default error handling
      return new AppError(ErrorCode.INTERNAL_ERROR, error.message, 500);
    }

    // Unknown error type
    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { originalError: String(error) }
    );
  }

  static isOperational(error: Error): boolean {
    if (error instanceof AppError) {
      return true;
    }
    return false;
  }
}