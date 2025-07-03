import Fastify from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './routers/_app';
import { createContext } from './context';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });

fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`🚀 tRPC server ready at ${address}/trpc`);
});
