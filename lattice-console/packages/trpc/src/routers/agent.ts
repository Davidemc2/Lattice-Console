import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const AgentStatusSchema = z.enum(['online', 'offline', 'error']);

const AgentInfoSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  platform: z.string(),
  dockerVersion: z.string().nullable(),
  status: AgentStatusSchema,
  lastSeen: z.date(),
  resources: z.object({
    cpuCores: z.number(),
    totalMemory: z.number(),
    availableMemory: z.number(),
    totalDisk: z.number(),
    availableDisk: z.number(),
  }),
});

export const agentRouter = createTRPCRouter({
  register: publicProcedure
    .input(z.object({
      hostname: z.string(),
      platform: z.string(),
      dockerVersion: z.string().nullable(),
      resources: z.object({
        cpuCores: z.number(),
        totalMemory: z.number(),
        totalDisk: z.number(),
      }),
      secret: z.string(),
    }))
    .output(z.object({
      id: z.string(),
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify agent secret
      if (input.secret !== process.env.AGENT_SECRET) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid agent secret',
        });
      }

      // This would be implemented in the backend
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Agent register endpoint not implemented',
      });
    }),

  heartbeat: publicProcedure
    .input(z.object({
      agentId: z.string(),
      token: z.string(),
      resources: z.object({
        availableMemory: z.number(),
        availableDisk: z.number(),
      }),
    }))
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // This would be implemented in the backend
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Agent heartbeat endpoint not implemented',
      });
    }),

  reportWorkloadStatus: publicProcedure
    .input(z.object({
      agentId: z.string(),
      token: z.string(),
      workloadId: z.string(),
      status: z.enum(['provisioning', 'running', 'stopping', 'stopped', 'error']),
      message: z.string().optional(),
      publicUrl: z.string().nullable().optional(),
      credentials: z.record(z.string()).optional(),
    }))
    .output(z.object({
      success: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // This would be implemented in the backend
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Report workload status endpoint not implemented',
      });
    }),

  getInfo: publicProcedure
    .output(z.array(AgentInfoSchema))
    .query(async ({ ctx }) => {
      // This would be implemented in the backend
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Get agent info endpoint not implemented',
      });
    }),

  health: publicProcedure
    .output(z.object({
      healthy: z.boolean(),
      agents: z.number(),
      activeWorkloads: z.number(),
    }))
    .query(async ({ ctx }) => {
      // This would return overall system health
      return {
        healthy: true,
        agents: 0,
        activeWorkloads: 0,
      };
    }),
});