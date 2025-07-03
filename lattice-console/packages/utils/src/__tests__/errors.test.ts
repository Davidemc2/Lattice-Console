import {
  AppError,
  ErrorCode,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ErrorHandler,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Test error',
        500,
        { detail: 'test' }
      );

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('AppError');
    });

    it('should convert to JSON correctly', () => {
      const error = new AppError(
        ErrorCode.BAD_REQUEST,
        'Bad request',
        400
      );

      const json = error.toJSON();
      expect(json).toEqual({
        code: ErrorCode.BAD_REQUEST,
        message: 'Bad request',
        details: undefined,
      });
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create an AuthenticationError with default message', () => {
      const error = new AuthenticationError();

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create an AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Token expired', ErrorCode.TOKEN_EXPIRED);

      expect(error.code).toBe(ErrorCode.TOKEN_EXPIRED);
      expect(error.message).toBe('Token expired');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError without ID', () => {
      const error = new NotFoundError('User');

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
    });

    it('should create a NotFoundError with ID', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe("User with id '123' not found");
    });
  });
});

describe('ErrorHandler', () => {
  describe('handle', () => {
    it('should return AppError as-is', () => {
      const appError = new AppError(ErrorCode.BAD_REQUEST, 'Bad request', 400);
      const result = ErrorHandler.handle(appError);

      expect(result).toBe(appError);
    });

    it('should convert Error to AppError', () => {
      const error = new Error('Something went wrong');
      const result = ErrorHandler.handle(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.message).toBe('Something went wrong');
      expect(result.statusCode).toBe(500);
    });

    it('should handle connection errors', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      const result = ErrorHandler.handle(error);

      expect(result.code).toBe(ErrorCode.CONNECTION_ERROR);
      expect(result.message).toBe('Service connection failed');
      expect(result.statusCode).toBe(503);
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout exceeded');
      const result = ErrorHandler.handle(error);

      expect(result.code).toBe(ErrorCode.TIMEOUT);
      expect(result.message).toBe('Operation timed out');
      expect(result.statusCode).toBe(504);
    });

    it('should handle unknown error types', () => {
      const result = ErrorHandler.handle('Unknown error');

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.details).toEqual({ originalError: 'Unknown error' });
    });
  });

  describe('isOperational', () => {
    it('should return true for AppError', () => {
      const error = new AppError(ErrorCode.BAD_REQUEST, 'Bad request', 400);
      expect(ErrorHandler.isOperational(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('System error');
      expect(ErrorHandler.isOperational(error)).toBe(false);
    });
  });
});