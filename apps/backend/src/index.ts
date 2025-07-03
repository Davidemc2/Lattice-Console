import Fastify from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './routers/_app';
import { createContext } from './context';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000'],
  credentials: true,
});

// Register tRPC
fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { 
    router: appRouter, 
    createContext: ({ req, res }: { req: any; res: any }) => createContext({ req, res })
  },
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`🚀 Lattice Console Backend API ready at ${address}`);
  fastify.log.info(`📡 tRPC endpoint: ${address}/trpc`);
  fastify.log.info(`❤️ Health check: ${address}/health`);
});
