import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@lattice-console/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '../lib/prisma';
import { randomBytes } from 'crypto';

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
    .mutation(async ({ input }) => {
      if (input.secret !== process.env.AGENT_SECRET) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid agent secret' });
      }
      // Create agent and token
      const token = randomBytes(32).toString('hex');
      const agent = await prisma.agent.create({
        data: {
          hostname: input.hostname,
          platform: input.platform,
          dockerVersion: input.dockerVersion,
          status: 'ONLINE',
          token,
          cpuCores: input.resources.cpuCores,
          totalMemory: BigInt(input.resources.totalMemory),
          totalDisk: BigInt(input.resources.totalDisk),
          lastSeenAt: new Date(),
        },
      });
      return { id: agent.id, token };
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
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const agent = await prisma.agent.findUnique({ where: { id: input.agentId, token: input.token } });
      if (!agent) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid agent credentials' });
      await prisma.agent.update({
        where: { id: input.agentId },
        data: {
          status: 'ONLINE',
          lastSeenAt: new Date(),
        },
      });
      await prisma.agentHeartbeat.create({
        data: {
          agentId: input.agentId,
          availableMemory: BigInt(input.resources.availableMemory),
          availableDisk: BigInt(input.resources.availableDisk),
        },
      });
      return { success: true };
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
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const agent = await prisma.agent.findUnique({ where: { id: input.agentId, token: input.token } });
      if (!agent) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid agent credentials' });
      await prisma.workload.update({
        where: { id: input.workloadId },
        data: {
          status: input.status.toUpperCase(),
          publicUrl: input.publicUrl || undefined,
          updatedAt: new Date(),
        },
      });
      // Optionally store credentials and message
      return { success: true };
    }),

  getInfo: publicProcedure
    .output(z.array(AgentInfoSchema))
    .query(async () => {
      const agents = await prisma.agent.findMany({
        include: {
          heartbeats: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
      });
      return agents.map(agent => ({
        id: agent.id,
        hostname: agent.hostname,
        platform: agent.platform,
        dockerVersion: agent.dockerVersion,
        status: agent.status.toLowerCase(),
        lastSeen: agent.lastSeenAt,
        resources: {
          cpuCores: agent.cpuCores,
          totalMemory: Number(agent.totalMemory),
          availableMemory: agent.heartbeats[0]?.availableMemory ? Number(agent.heartbeats[0].availableMemory) : 0,
          totalDisk: Number(agent.totalDisk),
          availableDisk: agent.heartbeats[0]?.availableDisk ? Number(agent.heartbeats[0].availableDisk) : 0,
        },
      }));
    }),

  ingestLog: publicProcedure
    .input(z.object({
      agentId: z.string(),
      token: z.string(),
      workloadId: z.string(),
      timestamp: z.string().datetime(),
      level: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify agent
      const agent = await ctx.prisma.agent.findFirst({
        where: {
          id: input.agentId,
          token: input.token,
        },
      });
      if (!agent) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid agent credentials',
        });
      }
      // Store log
      await ctx.prisma.workloadLog.create({
        data: {
          workloadId: input.workloadId,
          agentId: input.agentId,
          timestamp: new Date(input.timestamp),
          level: input.level,
          message: input.message,
        },
      });
      return { success: true };
    }),
});