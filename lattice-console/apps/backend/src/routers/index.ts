import { createTRPCRouter } from '@lattice-console/trpc';
import { authRouter } from './auth';
import { workloadRouter } from './workload';
import { agentRouter } from './agent';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  workload: workloadRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;