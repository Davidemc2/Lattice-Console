import { createTRPCRouter } from '../trpc';
import { authRouter } from './auth';
import { workloadRouter } from './workload';
import { agentRouter } from './agent';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  workload: workloadRouter,
  agent: agentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;