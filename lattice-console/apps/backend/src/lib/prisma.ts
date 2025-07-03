import { PrismaClient } from '@prisma/client';
import { Logger } from '@lattice-console/utils';

const logger = Logger.child({ module: 'prisma' });

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Log Prisma events
prisma.$on('query' as never, (e: any) => {
  if (process.env.LOG_LEVEL === 'debug') {
    logger.debug('Query', {
      query: e.query,
      params: e.params,
      duration: e.duration,
    });
  }
});

prisma.$on('error' as never, (e: any) => {
  logger.error('Database error', undefined, {
    message: e.message,
    target: e.target,
  });
});

prisma.$on('info' as never, (e: any) => {
  logger.info('Database info', { message: e.message });
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn('Database warning', { message: e.message });
});