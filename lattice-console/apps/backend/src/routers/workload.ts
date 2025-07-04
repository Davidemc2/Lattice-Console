import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@lattice-console/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '../lib/prisma';

export const workloadRouter = createTRPCRouter({
  list: publicProcedure
    .output(z.array(z.any()))
    .query(async () => {
      const workloads = await prisma.workload.findMany();
      return workloads;
    }),

  deploy: publicProcedure
    .input(z.object({
      type: z.enum(['POSTGRES', 'MINIO']),
      name: z.string(),
    }))
    .output(z.any())
    .mutation(async ({ input }) => {
      // Find an available agent (simplified: pick first online)
      const agent = await prisma.agent.findFirst({ where: { status: 'ONLINE' } });
      if (!agent) throw new TRPCError({ code: 'FAILED_PRECONDITION', message: 'No online agent available' });
      // Create workload
      const workload = await prisma.workload.create({
        data: {
          name: input.name,
          type: input.type,
          status: 'PROVISIONING',
          agentId: agent.id,
          userId: 'user-1', // TODO: use real user from session
          image: '',
          cpu: 1,
          memory: 512,
          storage: 10,
        },
      });
      return workload;
    }),

  getLogs: protectedProcedure
    .input(z.object({
      workloadId: z.string(),
      cursor: z.string().optional(), // log id for pagination
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ input, ctx }) => {
      // Check workload ownership
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.workloadId,
          userId: ctx.user!.id,
        },
      });
      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }
      // Fetch logs with pagination
      const logs = await ctx.prisma.workloadLog.findMany({
        where: { workloadId: input.workloadId },
        orderBy: { timestamp: 'asc' },
        take: input.limit + 1,
        ...(input.cursor && { skip: 1, cursor: { id: input.cursor } }),
        select: {
          id: true,
          timestamp: true,
          level: true,
          message: true,
          agentId: true,
        },
      });
      let nextCursor: string | null = null;
      if (logs.length > input.limit) {
        nextCursor = logs[input.limit].id;
        logs.length = input.limit;
      }
      return { logs, nextCursor };
    }),
});