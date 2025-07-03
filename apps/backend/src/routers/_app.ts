import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { Context } from '../context';
import { userRouter } from './user';
import { workloadRouter } from './workload';
import { nodeRouter } from './node';

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  health: t.procedure.query(() => ({ status: 'ok' })),
  user: userRouter,
  workload: workloadRouter,
  node: nodeRouter,
});

export type AppRouter = typeof appRouter;
