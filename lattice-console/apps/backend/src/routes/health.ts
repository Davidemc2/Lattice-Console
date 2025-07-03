import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { Logger } from '@lattice-console/utils';

const logger = Logger.child({ module: 'health' });

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: 'unknown',
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch (error) {
    health.status = 'degraded';
    health.database = 'disconnected';
    logger.error('Database health check failed', error);
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

healthRouter.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Database not ready',
    });
  }
});

healthRouter.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});