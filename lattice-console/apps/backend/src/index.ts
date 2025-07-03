import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from '@lattice-console/trpc';
import { appRouter } from './routers';
import { Logger } from '@lattice-console/utils';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimit';
import { healthRouter } from './routes/health';
import { prisma } from './lib/prisma';

const PORT = process.env.BACKEND_PORT || 3001;
const HOST = process.env.BACKEND_HOST || '0.0.0.0';

const app = express();
const logger = Logger.child({ service: 'backend' });

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Rate limiting
app.use('/trpc', rateLimiter);

// Health check routes
app.use('/health', healthRouter);

// tRPC middleware
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: async ({ req, res }) => {
      // Extract JWT from Authorization header and validate
      const token = req.headers.authorization?.replace('Bearer ', '');
      const user = await authMiddleware(token);
      
      return createContext({
        req,
        res,
        session: {
          user,
        },
      });
    },
    onError: ({ path, error }) => {
      logger.error('tRPC error', error, {
        path,
        code: error.code,
      });
    },
  })
);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    app.listen(Number(PORT), HOST, () => {
      logger.info(`Backend server listening`, {
        host: HOST,
        port: PORT,
        env: process.env.NODE_ENV,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

start();