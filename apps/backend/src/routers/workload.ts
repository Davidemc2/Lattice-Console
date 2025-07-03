import { t, protectedProcedure } from './_trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const workloadTypeSchema = z.enum(['postgres', 'minio', 'custom']);
const workloadStatusSchema = z.enum(['deploying', 'running', 'stopped', 'error']);

export const workloadRouter = t.router({
  // List all workloads for the authenticated user
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.workload.findMany({
      where: { userId: ctx.user.userId },
      include: {
        node: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }),

  // Get a specific workload by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.userId,
        },
        include: {
          node: true,
        },
      });

      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }

      return workload;
    }),

  // Deploy a new workload
  deploy: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        type: workloadTypeSchema,
        config: z.object({
          // For postgres
          database: z.string().optional(),
          username: z.string().optional(),
          password: z.string().optional(),
          // For custom workloads
          image: z.string().optional(),
          ports: z.array(z.number()).optional(),
          environment: z.record(z.string()).optional(),
          // For minio
          accessKey: z.string().optional(),
          secretKey: z.string().optional(),
          bucket: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check for duplicate names
      const existingWorkload = await ctx.prisma.workload.findFirst({
        where: {
          name: input.name,
          userId: ctx.user.userId,
        },
      });

      if (existingWorkload) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A workload with this name already exists',
        });
      }

      // Create workload record
      const workload = await ctx.prisma.workload.create({
        data: {
          name: input.name,
          type: input.type,
          status: 'deploying',
          userId: ctx.user.userId,
          config: input.config || {},
        },
      });

      // TODO: Send deployment request to agent
      // This would normally trigger the agent to deploy the container
      console.log(`Deploying workload ${workload.id} of type ${input.type}`);

      return workload;
    }),

  // Stop a workload
  stop: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.userId,
        },
      });

      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }

      if (workload.status === 'stopped') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workload is already stopped',
        });
      }

      // Update status
      const updatedWorkload = await ctx.prisma.workload.update({
        where: { id: input.id },
        data: { status: 'stopped' },
      });

      // TODO: Send stop request to agent
      console.log(`Stopping workload ${workload.id}`);

      return updatedWorkload;
    }),

  // Start a workload
  start: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.userId,
        },
      });

      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }

      if (workload.status === 'running') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workload is already running',
        });
      }

      // Update status
      const updatedWorkload = await ctx.prisma.workload.update({
        where: { id: input.id },
        data: { status: 'deploying' },
      });

      // TODO: Send start request to agent
      console.log(`Starting workload ${workload.id}`);

      return updatedWorkload;
    }),

  // Delete a workload
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.userId,
        },
      });

      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }

      // TODO: Send delete request to agent to cleanup container
      console.log(`Deleting workload ${workload.id}`);

      // Delete from database
      await ctx.prisma.workload.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get workload logs (placeholder - would normally stream from agent)
  logs: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      lines: z.number().min(1).max(1000).default(100),
    }))
    .query(async ({ input, ctx }) => {
      const workload = await ctx.prisma.workload.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.userId,
        },
      });

      if (!workload) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workload not found',
        });
      }

      // TODO: Fetch real logs from agent
      return {
        logs: [
          `[${new Date().toISOString()}] Container ${workload.name} starting...`,
          `[${new Date().toISOString()}] Container ${workload.name} is running`,
          `[${new Date().toISOString()}] Service available on port ${workload.port || 'N/A'}`,
        ],
      };
    }),
}); 