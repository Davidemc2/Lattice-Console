import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '@lattice-console/utils';

export const rateLimiter = rateLimit({
  windowMs: RATE_LIMITS.API_WINDOW_MS,
  max: RATE_LIMITS.API_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.LOGIN_WINDOW_MS,
  max: RATE_LIMITS.LOGIN_ATTEMPTS,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});