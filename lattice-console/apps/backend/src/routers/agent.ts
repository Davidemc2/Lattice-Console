import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@lattice-console/trpc';
import { prisma } from '../lib/prisma';
import { Logger } from '@lattice-console/utils';
import { TRPCError } from '@trpc/server';
import { CryptoUtils } from '@lattice-console/utils';

const logger = Logger.child({ service: 'agent-router' });

// Validation schemas
const AgentCapabilitiesSchema = z.object({
  cpu: z.number().min(1),
  memory: z.number().min(1000000000), // 1GB minimum
  disk: z.number().min(10000000000), // 10GB minimum
  networkBandwidth: z.number().optional(),
  supportedRuntimes: z.array(z.string()),
  gpus: z.array(z.object({
    model: z.string(),
    memory: z.number(),
    computeCapability: z.string().optional(),
  })).optional(),
  location: z.object({
    region: z.string(),
    datacenter: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
});

const AgentRegistrationSchema = z.object({
  hostname: z.string().min(1),
  platform: z.string(),
  dockerVersion: z.string(),
  agentVersion: z.string().default('1.0.0'),
  capabilities: AgentCapabilitiesSchema,
  metadata: z.record(z.string()).optional(),
});

const HeartbeatSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']).default('healthy'),
  resources: z.object({
    cpuUsage: z.number().min(0).max(100),
    memoryUsage: z.number().min(0).max(100),
    diskUsage: z.number().min(0).max(100),
    networkUtilization: z.number().min(0).optional(),
    activeContainers: z.number().min(0),
    load: z.array(z.number()).optional(), // Load averages
  }),
  metrics: z.object({
    completedJobs: z.number().min(0).default(0),
    failedJobs: z.number().min(0).default(0),
    totalUptime: z.number().min(0),
    lastJobCompletedAt: z.date().optional(),
  }).optional(),
  workloads: z.array(z.object({
    id: z.string(),
    status: z.enum(['running', 'paused', 'stopped', 'failed']),
    startedAt: z.date(),
    cpuUsage: z.number().optional(),
    memoryUsage: z.number().optional(),
  })).optional(),
});

const PoolConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criteria: z.object({
    minCpu: z.number().optional(),
    minMemory: z.number().optional(),
    minDisk: z.number().optional(),
    requiredRuntimes: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
  priority: z.number().min(1).max(10).default(5),
  maxAgents: z.number().min(1).optional(),
  healthThreshold: z.number().min(0).max(100).default(80),
});

export const agentRouter = router({
  // Agent Registration with approval workflow
  register: publicProcedure
    .input(AgentRegistrationSchema)
    .mutation(async ({ input }) => {
      try {
        // Generate secure credentials
        const agentId = CryptoUtils.generateSecureId();
        const token = CryptoUtils.generateSecureToken();
        const hashedToken = await CryptoUtils.hashToken(token);

        // Calculate initial ranking based on capabilities
        const ranking = calculateAgentRanking(input.capabilities);
        
        // Create agent record
        const agent = await prisma.agent.create({
          data: {
            id: agentId,
            hostname: input.hostname,
            platform: input.platform,
            dockerVersion: input.dockerVersion,
            agentVersion: input.agentVersion,
            capabilities: input.capabilities,
            metadata: input.metadata || {},
            tokenHash: hashedToken,
            status: 'pending_approval', // Requires admin approval
            ranking: ranking,
            poolId: await getDefaultPoolForAgent(input.capabilities),
            registeredAt: new Date(),
            lastSeenAt: new Date(),
          },
          include: {
            pool: true,
          },
        });

        logger.info('Agent registered', {
          agentId,
          hostname: input.hostname,
          platform: input.platform,
          ranking,
          poolId: agent.poolId,
        });

        // Create registration approval record
        await prisma.agentApproval.create({
          data: {
            agentId,
            status: 'pending',
            submittedAt: new Date(),
            submittedBy: 'system',
          },
        });

        return {
          id: agentId,
          token, // Return raw token only once
          status: 'pending_approval',
          ranking,
          pool: agent.pool,
          message: 'Registration successful. Awaiting approval.',
        };
      } catch (error) {
        logger.error('Agent registration failed', error, { input });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to register agent',
        });
      }
    }),

  // Agent approval (admin only)
  approve: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      approved: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user is admin
      if (ctx.session.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can approve agents',
        });
      }

      const approval = await prisma.agentApproval.findFirst({
        where: {
          agentId: input.agentId,
          status: 'pending',
        },
        include: {
          agent: true,
        },
      });

      if (!approval) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pending approval not found',
        });
      }

      const status = input.approved ? 'active' : 'rejected';
      
      // Update agent status
      await prisma.agent.update({
        where: { id: input.agentId },
        data: { status },
      });

      // Update approval record
      await prisma.agentApproval.update({
        where: { id: approval.id },
        data: {
          status: input.approved ? 'approved' : 'rejected',
          reviewedAt: new Date(),
          reviewedBy: ctx.session.user.id,
          reason: input.reason,
        },
      });

      logger.info('Agent approval processed', {
        agentId: input.agentId,
        approved: input.approved,
        reviewedBy: ctx.session.user.id,
      });

      return { success: true, status };
    }),

  // Enhanced heartbeat with comprehensive health monitoring
  heartbeat: publicProcedure
    .input(z.object({
      agentId: z.string(),
      token: z.string(),
      data: HeartbeatSchema,
    }))
    .mutation(async ({ input }) => {
      try {
        // Verify agent token
        const agent = await prisma.agent.findUnique({
          where: { id: input.agentId },
          include: { pool: true },
        });

        if (!agent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agent not found',
          });
        }

        if (agent.status !== 'active') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Agent not active',
          });
        }

        // Verify token
        const tokenValid = await CryptoUtils.verifyToken(input.token, agent.tokenHash);
        if (!tokenValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid token',
          });
        }

        // Calculate health score
        const healthScore = calculateHealthScore(input.data);
        
        // Update ranking based on performance
        const newRanking = updateAgentRanking(agent.ranking, input.data, healthScore);

        // Store heartbeat data
        await prisma.agentHeartbeat.create({
          data: {
            agentId: input.agentId,
            status: input.data.status,
            healthScore,
            resources: input.data.resources,
            metrics: input.data.metrics || {},
            workloads: input.data.workloads || [],
            timestamp: new Date(),
          },
        });

        // Update agent record
        await prisma.agent.update({
          where: { id: input.agentId },
          data: {
            lastSeenAt: new Date(),
            healthScore,
            ranking: newRanking,
            resources: input.data.resources,
            status: deriveAgentStatus(input.data.status, healthScore),
          },
        });

        // Check for pool reassignment
        const shouldReassign = await shouldReassignPool(agent, input.data);
        let newPool = agent.pool;
        
        if (shouldReassign) {
          const optimalPoolId = await getOptimalPoolForAgent(agent.id, input.data.resources);
          if (optimalPoolId && optimalPoolId !== agent.poolId) {
            await prisma.agent.update({
              where: { id: input.agentId },
              data: { poolId: optimalPoolId },
            });
            
            newPool = await prisma.agentPool.findUnique({
              where: { id: optimalPoolId },
            });

            logger.info('Agent reassigned to new pool', {
              agentId: input.agentId,
              oldPoolId: agent.poolId,
              newPoolId: optimalPoolId,
            });
          }
        }

        // Generate alerts if needed
        await checkAndGenerateAlerts(agent, input.data, healthScore);

        return {
          success: true,
          healthScore,
          ranking: newRanking,
          pool: newPool,
          instructions: await getAgentInstructions(input.agentId),
        };
      } catch (error) {
        logger.error('Heartbeat processing failed', error, {
          agentId: input.agentId,
        });
        throw error;
      }
    }),

  // Get agent status and metrics
  getStatus: protectedProcedure
    .input(z.object({
      agentId: z.string().optional(),
      poolId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const where: any = {};
      if (input.agentId) where.id = input.agentId;
      if (input.poolId) where.poolId = input.poolId;

      const agents = await prisma.agent.findMany({
        where,
        include: {
          pool: true,
          heartbeats: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              workloads: true,
              heartbeats: true,
            },
          },
        },
      });

      return agents.map(agent => ({
        ...agent,
        uptime: calculateUptime(agent.registeredAt, agent.lastSeenAt),
        avgHealthScore: calculateAverageHealthScore(agent.id),
      }));
    }),

  // Pool Management
  createPool: protectedProcedure
    .input(PoolConfigSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can create pools',
        });
      }

      const pool = await prisma.agentPool.create({
        data: {
          name: input.name,
          description: input.description,
          criteria: input.criteria,
          priority: input.priority,
          maxAgents: input.maxAgents,
          healthThreshold: input.healthThreshold,
          createdBy: ctx.session.user.id,
          createdAt: new Date(),
        },
      });

      logger.info('Agent pool created', {
        poolId: pool.id,
        name: input.name,
        createdBy: ctx.session.user.id,
      });

      return pool;
    }),

  // List pools with statistics
  listPools: protectedProcedure
    .query(async () => {
      const pools = await prisma.agentPool.findMany({
        include: {
          _count: {
            select: {
              agents: true,
            },
          },
          agents: {
            select: {
              status: true,
              healthScore: true,
              ranking: true,
            },
          },
        },
      });

      return pools.map(pool => ({
        ...pool,
        stats: {
          totalAgents: pool._count.agents,
          activeAgents: pool.agents.filter(a => a.status === 'active').length,
          avgHealthScore: pool.agents.reduce((sum, a) => sum + (a.healthScore || 0), 0) / pool.agents.length || 0,
          avgRanking: pool.agents.reduce((sum, a) => sum + a.ranking, 0) / pool.agents.length || 0,
        },
      }));
    }),

  // Get top performing agents
  getTopAgents: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      poolId: z.string().optional(),
      metric: z.enum(['ranking', 'healthScore', 'uptime']).default('ranking'),
    }))
    .query(async ({ input }) => {
      const where: any = { status: 'active' };
      if (input.poolId) where.poolId = input.poolId;

      const orderBy: any = {};
      orderBy[input.metric] = 'desc';

      const agents = await prisma.agent.findMany({
        where,
        orderBy,
        take: input.limit,
        include: {
          pool: true,
          heartbeats: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      return agents;
    }),

  // Comprehensive agent analytics
  getAnalytics: protectedProcedure
    .input(z.object({
      timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
      poolId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const timeRanges = {
        '1h': new Date(Date.now() - 60 * 60 * 1000),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const since = timeRanges[input.timeRange];
      const where: any = { timestamp: { gte: since } };
      if (input.poolId) where.agent = { poolId: input.poolId };

      const heartbeats = await prisma.agentHeartbeat.findMany({
        where,
        include: {
          agent: {
            include: { pool: true },
          },
        },
      });

      // Calculate analytics
      const analytics = {
        totalAgents: new Set(heartbeats.map(h => h.agentId)).size,
        avgHealthScore: heartbeats.reduce((sum, h) => sum + h.healthScore, 0) / heartbeats.length || 0,
        avgCpuUsage: heartbeats.reduce((sum, h) => sum + h.resources.cpuUsage, 0) / heartbeats.length || 0,
        avgMemoryUsage: heartbeats.reduce((sum, h) => sum + h.resources.memoryUsage, 0) / heartbeats.length || 0,
        totalContainers: heartbeats.reduce((sum, h) => sum + h.resources.activeContainers, 0),
        healthDistribution: {
          healthy: heartbeats.filter(h => h.status === 'healthy').length,
          degraded: heartbeats.filter(h => h.status === 'degraded').length,
          unhealthy: heartbeats.filter(h => h.status === 'unhealthy').length,
        },
        timeSeriesData: generateTimeSeriesData(heartbeats, input.timeRange),
      };

      return analytics;
    }),
});

// Helper functions
function calculateAgentRanking(capabilities: any): number {
  let score = 0;
  
  // CPU weight: 30%
  score += Math.min(capabilities.cpu * 10, 300);
  
  // Memory weight: 25%
  score += Math.min(capabilities.memory / 1000000000 * 25, 250);
  
  // Disk weight: 15%
  score += Math.min(capabilities.disk / 1000000000 * 1.5, 150);
  
  // Runtime support weight: 20%
  score += Math.min(capabilities.supportedRuntimes.length * 40, 200);
  
  // GPU bonus weight: 10%
  if (capabilities.gpus && capabilities.gpus.length > 0) {
    score += Math.min(capabilities.gpus.length * 50, 100);
  }
  
  return Math.round(Math.min(score, 1000));
}

function calculateHealthScore(heartbeatData: any): number {
  let score = 100;
  
  // CPU usage penalty
  if (heartbeatData.resources.cpuUsage > 90) score -= 30;
  else if (heartbeatData.resources.cpuUsage > 80) score -= 15;
  
  // Memory usage penalty
  if (heartbeatData.resources.memoryUsage > 95) score -= 25;
  else if (heartbeatData.resources.memoryUsage > 85) score -= 10;
  
  // Disk usage penalty
  if (heartbeatData.resources.diskUsage > 95) score -= 20;
  else if (heartbeatData.resources.diskUsage > 90) score -= 10;
  
  // Status penalty
  if (heartbeatData.status === 'degraded') score -= 20;
  else if (heartbeatData.status === 'unhealthy') score -= 50;
  
  return Math.max(score, 0);
}

function updateAgentRanking(currentRanking: number, heartbeatData: any, healthScore: number): number {
  // Adjust ranking based on performance
  let adjustment = 0;
  
  // Health score influence (±10 points)
  if (healthScore >= 95) adjustment += 5;
  else if (healthScore >= 85) adjustment += 2;
  else if (healthScore < 70) adjustment -= 5;
  else if (healthScore < 50) adjustment -= 10;
  
  // Job completion rate influence
  if (heartbeatData.metrics) {
    const successRate = heartbeatData.metrics.completedJobs / 
      (heartbeatData.metrics.completedJobs + heartbeatData.metrics.failedJobs);
    
    if (successRate >= 0.95) adjustment += 3;
    else if (successRate < 0.8) adjustment -= 3;
  }
  
  const newRanking = currentRanking + adjustment;
  return Math.max(0, Math.min(1000, newRanking));
}

async function getDefaultPoolForAgent(capabilities: any): Promise<string | null> {
  const pools = await prisma.agentPool.findMany({
    orderBy: { priority: 'desc' },
  });
  
  for (const pool of pools) {
    if (await agentMatchesPoolCriteria(capabilities, pool.criteria)) {
      return pool.id;
    }
  }
  
  return null;
}

async function agentMatchesPoolCriteria(capabilities: any, criteria: any): Promise<boolean> {
  if (criteria.minCpu && capabilities.cpu < criteria.minCpu) return false;
  if (criteria.minMemory && capabilities.memory < criteria.minMemory) return false;
  if (criteria.minDisk && capabilities.disk < criteria.minDisk) return false;
  
  if (criteria.requiredRuntimes) {
    for (const runtime of criteria.requiredRuntimes) {
      if (!capabilities.supportedRuntimes.includes(runtime)) return false;
    }
  }
  
  return true;
}

function deriveAgentStatus(heartbeatStatus: string, healthScore: number): string {
  if (heartbeatStatus === 'unhealthy' || healthScore < 30) return 'unhealthy';
  if (heartbeatStatus === 'degraded' || healthScore < 70) return 'degraded';
  return 'active';
}

async function shouldReassignPool(agent: any, heartbeatData: any): Promise<boolean> {
  // Check if agent performance suggests a different pool would be better
  // This is a simplified implementation
  return false;
}

async function getOptimalPoolForAgent(agentId: string, resources: any): Promise<string | null> {
  // Find the best pool for this agent based on current performance
  // This is a simplified implementation
  return null;
}

async function checkAndGenerateAlerts(agent: any, heartbeatData: any, healthScore: number) {
  const alerts = [];
  
  if (healthScore < 50) {
    alerts.push({
      type: 'agent_unhealthy',
      severity: 'high',
      message: `Agent ${agent.hostname} is unhealthy (score: ${healthScore})`,
    });
  }
  
  if (heartbeatData.resources.cpuUsage > 95) {
    alerts.push({
      type: 'high_cpu_usage',
      severity: 'medium',
      message: `Agent ${agent.hostname} has high CPU usage (${heartbeatData.resources.cpuUsage}%)`,
    });
  }
  
  // Store alerts in database
  for (const alert of alerts) {
    await prisma.agentAlert.create({
      data: {
        agentId: agent.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: new Date(),
      },
    });
  }
}

async function getAgentInstructions(agentId: string): Promise<any[]> {
  // Return any pending instructions for the agent
  return [];
}

function calculateUptime(registeredAt: Date, lastSeenAt: Date | null): number {
  if (!lastSeenAt) return 0;
  return Date.now() - registeredAt.getTime();
}

async function calculateAverageHealthScore(agentId: string): Promise<number> {
  const result = await prisma.agentHeartbeat.aggregate({
    where: { agentId },
    _avg: { healthScore: true },
  });
  
  return result._avg.healthScore || 0;
}

function generateTimeSeriesData(heartbeats: any[], timeRange: string): any[] {
  // Generate time series data for charts
  // This is a simplified implementation
  return [];
}