import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorHandler, Logger } from '@lattice-console/utils';

const logger = Logger.child({ module: 'errorHandler' });

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle the error using our error handler utility
  const appError = ErrorHandler.handle(err);

  // Log the error
  logger.error('Request error', err, {
    path: req.path,
    method: req.method,
    statusCode: appError.statusCode,
    errorCode: appError.code,
  });

  // Send error response
  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(process.env.NODE_ENV === 'development' && {
        details: appError.details,
        stack: err.stack,
      }),
    },
  });
}